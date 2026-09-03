import { version } from '$app/env'
import { assets, immutable } from '$app/manifest'
import { self } from '$app/service-worker'

const CACHE_PREFIX = 'regneflyt-app-cache'
const CACHE_SCHEMA_VERSION = 'v1'
const APP_CACHE = `${CACHE_PREFIX}-${CACHE_SCHEMA_VERSION}-${version}`
const LEGACY_APP_CACHE_PREFIX = 'app-cache-'
const APP_SHELL_URL = '/'
const OFFLINE_URL = '/offline.html'

const toCache = [...immutable, ...assets].map(({ path }) => path)
toCache.push(APP_SHELL_URL)
const staticAssets = new Set(
	toCache.map((path) => new URL(path, self.location.href).pathname)
)

type SkipWaitingMessage = {
	type: 'SKIP_WAITING'
}

type WorkerLifecycleEvent = {
	waitUntil: (promise: Promise<unknown>) => void
}

type WorkerMessageEvent = {
	data: unknown
}

type WorkerFetchEvent = {
	request: Request
	respondWith: (response: Promise<Response> | Response) => void
}

function isSkipWaitingMessage(data: unknown): data is SkipWaitingMessage {
	return (
		typeof data === 'object' &&
		data !== null &&
		'type' in data &&
		data.type === 'SKIP_WAITING'
	)
}

function isVersionedAppCacheName(key: string): boolean {
	return key.startsWith(`${CACHE_PREFIX}-${CACHE_SCHEMA_VERSION}-`)
}

self.addEventListener('install', (event: WorkerLifecycleEvent) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(APP_CACHE)
			await cache.addAll(toCache)
		})()
	)
})

self.addEventListener('message', (event: WorkerMessageEvent) => {
	const data: unknown = event.data
	if (isSkipWaitingMessage(data)) {
		void self.skipWaiting()
	}
})

self.addEventListener('activate', (event: WorkerLifecycleEvent) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys()

			// Migration policy: keep the current cache, remove legacy and stale
			// app caches. The precache repopulates on the next install.
			for (const key of keys) {
				const isLegacyAppCache = key.startsWith(LEGACY_APP_CACHE_PREFIX)
				const isVersionedAppCache = isVersionedAppCacheName(key)
				const isManagedAppCache = isLegacyAppCache || isVersionedAppCache

				if (isManagedAppCache && key !== APP_CACHE) {
					await caches.delete(key)
				}
			}

			await self.clients.claim()
		})()
	)
})

self.addEventListener('fetch', (event: WorkerFetchEvent) => {
	if (event.request.method !== 'GET' || event.request.headers.has('range'))
		return

	const url = new URL(event.request.url)

	// don't try to handle e.g. data: URIs
	const isHttp = url.protocol.startsWith('http')
	const isSameOrigin = url.origin === self.location.origin
	const isDevServerRequest =
		url.hostname === self.location.hostname && url.port !== self.location.port
	const isStaticAsset =
		url.host === self.location.host && staticAssets.has(url.pathname)
	const skipBecauseUncached =
		event.request.cache === 'only-if-cached' && !isStaticAsset

	if (!isHttp || !isSameOrigin || isDevServerRequest || skipBecauseUncached)
		return

	if (event.request.mode === 'navigate') {
		event.respondWith(
			(async () => {
				try {
					return await fetch(event.request)
				} catch {
					return (
						(await caches.match(APP_SHELL_URL)) ??
						(await caches.match(OFFLINE_URL)) ??
						Response.error()
					)
				}
			})()
		)
		return
	}

	if (isStaticAsset) {
		event.respondWith(
			(async () => {
				const cached = await caches.match(event.request)
				if (cached) return cached

				try {
					const response = await fetch(event.request)
					if (response.ok) {
						const cache = await caches.open(APP_CACHE)
						await cache.put(event.request, response.clone())
					}
					return response
				} catch {
					return Response.error()
				}
			})()
		)
		return
	}

	event.respondWith(
		(async () => {
			try {
				return await fetch(event.request)
			} catch {
				return (await caches.match(event.request)) ?? Response.error()
			}
		})()
	)
})
