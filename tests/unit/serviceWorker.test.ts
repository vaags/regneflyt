import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('$service-worker', () => ({
	build: ['/_app/immutable/chunks/app.js'],
	files: ['/offline.html'],
	version: 'test'
}))

type FetchEventLike = {
	request: {
		method: string
		headers: { has: (name: string) => boolean }
		url: string
		mode: RequestMode
		cache: RequestCache
	}
	respondWith: (response: Promise<Response> | Response) => void
}

type InstallEventLike = {
	waitUntil: (p: Promise<unknown>) => void
}

type ActivateEventLike = {
	waitUntil: (p: Promise<unknown>) => void
}

type MessageEventLike = {
	data: { type: string }
}

type ServiceWorkerEventMap = {
	install: InstallEventLike
	activate: ActivateEventLike
	fetch: FetchEventLike
	message: MessageEventLike
}

type ServiceWorkerSelfLike = {
	skipWaiting: (...args: unknown[]) => unknown
	clients: {
		claim: (...args: unknown[]) => unknown
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function isCallable(value: unknown): value is (...args: unknown[]) => unknown {
	return typeof value === 'function'
}

function getRequiredListener<K extends keyof ServiceWorkerEventMap>(
	listeners: Partial<
		Record<keyof ServiceWorkerEventMap, (event: unknown) => void>
	>,
	type: K
): (event: ServiceWorkerEventMap[K]) => void {
	const handler = listeners[type]
	if (handler === undefined) {
		throw new Error(`Expected ${String(type)} listener to be registered`)
	}

	return (event: ServiceWorkerEventMap[K]) => {
		handler(event)
	}
}

function getServiceWorkerSelf(): ServiceWorkerSelfLike {
	const swSelf: unknown = globalThis.self
	if (!isRecord(swSelf)) {
		throw new Error('Expected global self to be an object')
	}

	const skipWaiting = swSelf.skipWaiting
	if (!isCallable(skipWaiting)) {
		throw new Error('Expected service worker self shape')
	}

	const clients = swSelf.clients
	if (!isRecord(clients)) {
		throw new Error('Expected service worker clients.claim')
	}

	const claim = clients.claim
	if (!isCallable(claim)) {
		throw new Error('Expected service worker clients.claim')
	}

	return {
		skipWaiting,
		clients: { claim }
	}
}

describe('service worker', () => {
	const savedGlobals: Record<string, unknown> = {}

	beforeEach(() => {
		vi.resetModules()
		vi.clearAllMocks()
		savedGlobals.self = globalThis.self
		savedGlobals.caches = globalThis.caches
		savedGlobals.fetch = globalThis.fetch
	})

	afterEach(() => {
		Object.assign(globalThis, {
			self: savedGlobals.self,
			caches: savedGlobals.caches,
			fetch: savedGlobals.fetch
		})
	})

	async function setupServiceWorkerEnvironment() {
		const listeners: Partial<
			Record<keyof ServiceWorkerEventMap, (event: unknown) => void>
		> = {}

		const cachePut = vi.fn(() => Promise.resolve(undefined))
		const cacheAddAll = vi.fn(() => Promise.resolve(undefined))
		const cacheDeleteEntry = vi.fn(() => Promise.resolve(true))
		const metadataStore = new Map<string, Response>()
		const metadataMatch = vi.fn((request?: RequestInfo | URL) => {
			const key = typeof request === 'string' ? request : String(request)
			return Promise.resolve(metadataStore.get(key))
		})
		const metadataPut = vi.fn((request: RequestInfo | URL, value: Response) => {
			const key = typeof request === 'string' ? request : String(request)
			metadataStore.set(key, value)
			return Promise.resolve(undefined)
		})
		const cacheOpen = vi.fn((cacheName?: string) => {
			if (cacheName === 'regneflyt-app-cache-meta-v1') {
				return Promise.resolve({
					match: metadataMatch,
					put: metadataPut,
					delete: vi.fn(() => Promise.resolve(true))
				})
			}

			return Promise.resolve({
				addAll: cacheAddAll,
				put: cachePut,
				delete: cacheDeleteEntry,
				match: metadataMatch
			})
		})
		const cacheMatch = vi.fn((_request?: RequestInfo | URL) =>
			Promise.resolve(undefined as Response | undefined)
		)
		const cacheDelete = vi.fn(() => Promise.resolve(true))
		const cacheKeys = vi.fn(() => Promise.resolve([] as string[]))

		const fetchMock = vi.fn()

		Object.assign(globalThis, {
			self: {
				location: new URL('https://regneflyt.no'),
				skipWaiting: vi.fn(),
				clients: { claim: vi.fn() },
				addEventListener: vi.fn(
					(
						type: keyof ServiceWorkerEventMap,
						callback: (event: unknown) => void
					) => {
						listeners[type] = callback
					}
				)
			},
			caches: {
				open: cacheOpen,
				match: cacheMatch,
				keys: cacheKeys,
				delete: cacheDelete
			},
			fetch: fetchMock
		})

		await import('../../src/service-worker')

		return {
			listeners,
			fetchMock,
			cacheMatch,
			cacheOpen,
			cacheAddAll,
			cachePut,
			cacheDeleteEntry,
			metadataPut,
			metadataStore,
			cacheDelete,
			cacheKeys
		}
	}

	describe('install event', () => {
		it('pre-caches static assets on install', async () => {
			const { listeners, cacheOpen, cacheAddAll } =
				await setupServiceWorkerEnvironment()

			const installHandler = getRequiredListener(listeners, 'install')

			let waitPromise: Promise<unknown> | undefined
			installHandler({
				waitUntil: (p) => {
					waitPromise = p
				}
			})
			await waitPromise

			expect(cacheOpen).toHaveBeenCalledOnce()
			expect(cacheAddAll).toHaveBeenCalledOnce()
			expect(cacheAddAll).toHaveBeenCalledWith(
				expect.arrayContaining(['/', '/offline.html'])
			)
		})
	})

	describe('activate event', () => {
		it('deletes stale caches, keeps one rollback cache, and claims clients', async () => {
			const { listeners, cacheKeys, cacheDelete, metadataPut, metadataStore } =
				await setupServiceWorkerEnvironment()

			cacheKeys.mockResolvedValueOnce([
				'app-cache-legacy',
				'regneflyt-app-cache-v1-old-2',
				'regneflyt-app-cache-v1-old-1',
				'regneflyt-app-cache-v1-test'
			])
			metadataStore.set(
				'/__cache_meta__/regneflyt-app-cache-v1-old-2',
				new Response(JSON.stringify({ activatedAt: 200 }))
			)
			metadataStore.set(
				'/__cache_meta__/regneflyt-app-cache-v1-old-1',
				new Response(JSON.stringify({ activatedAt: 100 }))
			)

			const activateHandler = getRequiredListener(listeners, 'activate')

			let waitPromise: Promise<unknown> | undefined
			activateHandler({
				waitUntil: (p) => {
					waitPromise = p
				}
			})
			await waitPromise

			expect(cacheDelete).toHaveBeenCalledWith('app-cache-legacy')
			expect(cacheDelete).toHaveBeenCalledWith('regneflyt-app-cache-v1-old-1')
			expect(cacheDelete).not.toHaveBeenCalledWith(
				'regneflyt-app-cache-v1-old-2'
			)
			expect(cacheDelete).not.toHaveBeenCalledWith(
				'regneflyt-app-cache-v1-test'
			)
			expect(metadataPut).toHaveBeenCalledOnce()
			expect(getServiceWorkerSelf().clients.claim).toHaveBeenCalled()
		})

		it('continues activation when metadata write fails', async () => {
			const { listeners, cacheKeys, metadataPut } =
				await setupServiceWorkerEnvironment()

			cacheKeys.mockResolvedValueOnce(['regneflyt-app-cache-v1-test'])
			metadataPut.mockRejectedValueOnce(new Error('metadata write failed'))

			const activateHandler = getRequiredListener(listeners, 'activate')

			let waitPromise: Promise<unknown> | undefined
			activateHandler({
				waitUntil: (p) => {
					waitPromise = p
				}
			})

			await expect(waitPromise).resolves.toBeUndefined()
			expect(getServiceWorkerSelf().clients.claim).toHaveBeenCalled()
		})
	})

	describe('successful fetch paths', () => {
		it('returns network response for navigation requests', async () => {
			const { listeners, fetchMock } = await setupServiceWorkerEnvironment()

			fetchMock.mockResolvedValueOnce(new Response('page html'))

			let responsePromise: Promise<Response> | undefined
			getRequiredListener(
				listeners,
				'fetch'
			)({
				request: {
					method: 'GET',
					headers: { has: () => false },
					url: 'https://regneflyt.no/some-route',
					mode: 'navigate',
					cache: 'default'
				},
				respondWith: (response) => {
					responsePromise = Promise.resolve(response)
				}
			})

			const response = await responsePromise!
			expect(await response.text()).toBe('page html')
		})

		it('serves static asset from cache when available', async () => {
			const { listeners, fetchMock, cacheMatch } =
				await setupServiceWorkerEnvironment()

			cacheMatch.mockResolvedValueOnce(new Response('cached asset'))

			let responsePromise: Promise<Response> | undefined
			getRequiredListener(
				listeners,
				'fetch'
			)({
				request: {
					method: 'GET',
					headers: { has: () => false },
					url: 'https://regneflyt.no/offline.html',
					mode: 'cors',
					cache: 'default'
				},
				respondWith: (response) => {
					responsePromise = Promise.resolve(response)
				}
			})

			const response = await responsePromise!
			expect(await response.text()).toBe('cached asset')
			expect(fetchMock).not.toHaveBeenCalled()
		})

		it('fetches and caches static asset on cache miss', async () => {
			const { listeners, fetchMock, cacheMatch, cachePut } =
				await setupServiceWorkerEnvironment()

			cacheMatch.mockResolvedValueOnce(undefined)
			fetchMock.mockResolvedValueOnce(
				new Response('fresh asset', { status: 200 })
			)

			let responsePromise: Promise<Response> | undefined
			getRequiredListener(
				listeners,
				'fetch'
			)({
				request: {
					method: 'GET',
					headers: { has: () => false },
					url: 'https://regneflyt.no/offline.html',
					mode: 'cors',
					cache: 'default'
				},
				respondWith: (response) => {
					responsePromise = Promise.resolve(response)
				}
			})

			const response = await responsePromise!
			expect(response.status).toBe(200)
			expect(cachePut).toHaveBeenCalledOnce()
		})

		it('recovers from stale static asset cache entries', async () => {
			const { listeners, fetchMock, cacheMatch, cacheDeleteEntry, cachePut } =
				await setupServiceWorkerEnvironment()

			cacheMatch.mockResolvedValueOnce(new Response('stale', { status: 500 }))
			fetchMock.mockResolvedValueOnce(new Response('ok', { status: 202 }))

			let responsePromise: Promise<Response> | undefined
			getRequiredListener(
				listeners,
				'fetch'
			)({
				request: {
					method: 'GET',
					headers: { has: () => false },
					url: 'https://regneflyt.no/offline.html',
					mode: 'cors',
					cache: 'default'
				},
				respondWith: (response) => {
					responsePromise = Promise.resolve(response)
				}
			})

			const response = await responsePromise!
			expect(response.status).toBe(202)
			expect(cacheDeleteEntry).toHaveBeenCalledOnce()
			expect(cachePut).toHaveBeenCalledOnce()
		})
	})

	it('fails install when pre-cache fails', async () => {
		const { listeners, cacheAddAll } = await setupServiceWorkerEnvironment()

		cacheAddAll.mockRejectedValueOnce(new Error('cache exploded'))

		const installHandler = getRequiredListener(listeners, 'install')

		let waitPromise: Promise<unknown> | undefined
		installHandler({
			waitUntil: (p) => {
				waitPromise = p
			}
		})

		await expect(waitPromise).rejects.toThrow('cache exploded')
	})

	it('falls back to cached app shell for failed navigations', async () => {
		const { listeners, fetchMock, cacheMatch } =
			await setupServiceWorkerEnvironment()

		fetchMock.mockRejectedValueOnce(new Error('network down'))
		cacheMatch.mockImplementation((request?: RequestInfo | URL) => {
			if (request === '/') return Promise.resolve(new Response('app shell'))
			return Promise.resolve(undefined)
		})

		expect(listeners.fetch).toBeDefined()

		let responsePromise: Promise<Response> | undefined
		getRequiredListener(
			listeners,
			'fetch'
		)({
			request: {
				method: 'GET',
				headers: { has: () => false },
				url: 'https://regneflyt.no/some-route',
				mode: 'navigate',
				cache: 'default'
			},
			respondWith: (response) => {
				responsePromise = Promise.resolve(response)
			}
		})

		const response = await responsePromise!
		expect(await response.text()).toBe('app shell')
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})

	it('returns error response when static asset fetch fails and cache misses', async () => {
		const { listeners, fetchMock, cacheMatch } =
			await setupServiceWorkerEnvironment()

		fetchMock.mockRejectedValueOnce(new Error('network down'))
		cacheMatch.mockResolvedValueOnce(undefined)

		expect(listeners.fetch).toBeDefined()

		let responsePromise: Promise<Response> | undefined
		getRequiredListener(
			listeners,
			'fetch'
		)({
			request: {
				method: 'GET',
				headers: { has: () => false },
				url: 'https://regneflyt.no/offline.html',
				mode: 'cors',
				cache: 'default'
			},
			respondWith: (response) => {
				responsePromise = Promise.resolve(response)
			}
		})

		const response = await responsePromise!
		expect(response).toBeInstanceOf(Response)
		expect(response.type).toBe('error')
	})

	it('falls back to request-matched cache for non-static fetch failures', async () => {
		const { listeners, fetchMock, cacheMatch } =
			await setupServiceWorkerEnvironment()

		fetchMock.mockRejectedValueOnce(new Error('network down'))
		cacheMatch.mockResolvedValueOnce(new Response('cached payload'))

		expect(listeners.fetch).toBeDefined()

		let responsePromise: Promise<Response> | undefined
		getRequiredListener(
			listeners,
			'fetch'
		)({
			request: {
				method: 'GET',
				headers: { has: () => false },
				url: 'https://regneflyt.no/api/something',
				mode: 'cors',
				cache: 'default'
			},
			respondWith: (response) => {
				responsePromise = Promise.resolve(response)
			}
		})

		const response = await responsePromise!
		expect(await response.text()).toBe('cached payload')
	})

	it('calls skipWaiting when receiving SKIP_WAITING message', async () => {
		const { listeners } = await setupServiceWorkerEnvironment()

		const messageHandler = getRequiredListener(listeners, 'message')

		messageHandler({ data: { type: 'SKIP_WAITING' } })

		expect(getServiceWorkerSelf().skipWaiting).toHaveBeenCalledOnce()
	})

	it('ignores messages that are not SKIP_WAITING', async () => {
		const { listeners } = await setupServiceWorkerEnvironment()

		const messageHandler = getRequiredListener(listeners, 'message')

		messageHandler({ data: { type: 'SOMETHING_ELSE' } })

		expect(getServiceWorkerSelf().skipWaiting).not.toHaveBeenCalled()
	})
})
