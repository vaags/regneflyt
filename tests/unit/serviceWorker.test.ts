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
		const listeners: Record<string, (event: FetchEventLike) => void> = {}

		const cachePut = vi.fn(async () => undefined)
		const cacheAddAll = vi.fn(async () => undefined)
		const cacheDeleteEntry = vi.fn(async () => true)
		const metadataStore = new Map<string, Response>()
		const metadataMatch = vi.fn(async (request?: RequestInfo | URL) => {
			const key = typeof request === 'string' ? request : String(request)
			return metadataStore.get(key)
		})
		const metadataPut = vi.fn(
			async (request: RequestInfo | URL, value: Response) => {
				const key = typeof request === 'string' ? request : String(request)
				metadataStore.set(key, value)
			}
		)
		const cacheOpen = vi.fn(async (cacheName?: string) => {
			if (cacheName === 'regneflyt-app-cache-meta-v1') {
				return {
					match: metadataMatch,
					put: metadataPut,
					delete: vi.fn(async () => true)
				}
			}

			return {
				addAll: cacheAddAll,
				put: cachePut,
				delete: cacheDeleteEntry,
				match: metadataMatch
			}
		})
		const cacheMatch = vi.fn(
			async (_request?: RequestInfo | URL) => undefined as Response | undefined
		)
		const cacheDelete = vi.fn(async () => true)
		const cacheKeys = vi.fn(async () => [] as string[])

		const fetchMock = vi.fn()

		Object.assign(globalThis, {
			self: {
				location: new URL('https://regneflyt.no'),
				skipWaiting: vi.fn(),
				clients: { claim: vi.fn() },
				addEventListener: vi.fn(
					(type: string, callback: (event: FetchEventLike) => void) => {
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

			const installHandler = listeners.install as unknown as (event: {
				waitUntil: (p: Promise<unknown>) => void
			}) => void
			expect(installHandler).toBeDefined()

			let waitPromise: Promise<unknown> | undefined
			installHandler({
				waitUntil: (p) => {
					waitPromise = p
				}
			})
			await waitPromise

			expect(cacheOpen).toHaveBeenCalledOnce()
			expect(cacheAddAll).toHaveBeenCalledOnce()
			const cached = (cacheAddAll.mock.calls[0] as unknown as [string[]])[0]
			expect(cached).toContain('/')
			expect(cached).toContain('/offline.html')
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

			const activateHandler = listeners.activate as unknown as (event: {
				waitUntil: (p: Promise<unknown>) => void
			}) => void
			expect(activateHandler).toBeDefined()

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
			expect(
				(
					globalThis.self as unknown as {
						clients: { claim: ReturnType<typeof vi.fn> }
					}
				).clients.claim
			).toHaveBeenCalled()
		})

		it('continues activation when metadata write fails', async () => {
			const { listeners, cacheKeys, metadataPut, fetchMock } =
				await setupServiceWorkerEnvironment()

			cacheKeys.mockResolvedValueOnce(['regneflyt-app-cache-v1-test'])
			metadataPut.mockRejectedValueOnce(new Error('metadata write failed'))
			fetchMock.mockResolvedValueOnce(
				new Response('telemetry ok', { status: 202 })
			)

			const activateHandler = listeners.activate as unknown as (event: {
				waitUntil: (p: Promise<unknown>) => void
			}) => void

			let waitPromise: Promise<unknown> | undefined
			activateHandler({
				waitUntil: (p) => {
					waitPromise = p
				}
			})

			await expect(waitPromise).resolves.toBeUndefined()
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/sw-telemetry',
				expect.objectContaining({ method: 'POST' })
			)
			expect(
				(
					globalThis.self as unknown as {
						clients: { claim: ReturnType<typeof vi.fn> }
					}
				).clients.claim
			).toHaveBeenCalled()
		})
	})

	describe('successful fetch paths', () => {
		it('returns network response for navigation requests', async () => {
			const { listeners, fetchMock } = await setupServiceWorkerEnvironment()

			fetchMock.mockResolvedValueOnce(new Response('page html'))

			let responsePromise: Promise<Response> | undefined
			listeners.fetch!({
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
			listeners.fetch!({
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
			listeners.fetch!({
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
			fetchMock
				.mockResolvedValueOnce(new Response('telemetry ok', { status: 202 }))
				.mockResolvedValueOnce(new Response('ok', { status: 202 }))

			let responsePromise: Promise<Response> | undefined
			listeners.fetch!({
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
			expect(fetchMock).toHaveBeenNthCalledWith(
				1,
				'/api/sw-telemetry',
				expect.objectContaining({ method: 'POST' })
			)
		})
	})

	it('sends telemetry when install pre-cache fails', async () => {
		const { listeners, cacheAddAll, fetchMock } =
			await setupServiceWorkerEnvironment()

		cacheAddAll.mockRejectedValueOnce(new Error('cache exploded'))
		fetchMock.mockResolvedValueOnce(
			new Response('telemetry ok', { status: 202 })
		)

		const installHandler = listeners.install as unknown as (event: {
			waitUntil: (p: Promise<unknown>) => void
		}) => void

		let waitPromise: Promise<unknown> | undefined
		installHandler({
			waitUntil: (p) => {
				waitPromise = p
			}
		})

		await expect(waitPromise).rejects.toThrow('cache exploded')
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/sw-telemetry',
			expect.objectContaining({ method: 'POST' })
		)
	})

	it('falls back to cached app shell for failed navigations', async () => {
		const { listeners, fetchMock, cacheMatch } =
			await setupServiceWorkerEnvironment()

		fetchMock.mockRejectedValueOnce(new Error('network down'))
		cacheMatch.mockImplementation(async (request?: RequestInfo | URL) => {
			if (request === '/') return new Response('app shell')
			return undefined
		})

		expect(listeners.fetch).toBeDefined()

		let responsePromise: Promise<Response> | undefined
		listeners.fetch!({
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
		expect(fetchMock).toHaveBeenCalledTimes(2)
		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			'/api/sw-telemetry',
			expect.objectContaining({ method: 'POST' })
		)
	})

	it('returns error response when static asset fetch fails and cache misses', async () => {
		const { listeners, fetchMock, cacheMatch } =
			await setupServiceWorkerEnvironment()

		fetchMock.mockRejectedValueOnce(new Error('network down'))
		cacheMatch.mockResolvedValueOnce(undefined)

		expect(listeners.fetch).toBeDefined()

		let responsePromise: Promise<Response> | undefined
		listeners.fetch!({
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
		listeners.fetch!({
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

		const messageHandler = listeners.message as unknown as (event: {
			data: { type: string }
		}) => void
		expect(messageHandler).toBeDefined()

		messageHandler({ data: { type: 'SKIP_WAITING' } })

		expect(
			(globalThis.self as unknown as { skipWaiting: ReturnType<typeof vi.fn> })
				.skipWaiting
		).toHaveBeenCalledOnce()
	})

	it('ignores messages that are not SKIP_WAITING', async () => {
		const { listeners } = await setupServiceWorkerEnvironment()

		const messageHandler = listeners.message as unknown as (event: {
			data: { type: string }
		}) => void

		messageHandler({ data: { type: 'SOMETHING_ELSE' } })

		expect(
			(globalThis.self as unknown as { skipWaiting: ReturnType<typeof vi.fn> })
				.skipWaiting
		).not.toHaveBeenCalled()
	})
})
