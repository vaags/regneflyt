import { beforeEach, describe, expect, it, vi } from 'vitest'

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

describe('service worker fetch logic', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.clearAllMocks()
	})

	async function setupServiceWorkerEnvironment() {
		const listeners: Record<string, (event: FetchEventLike) => void> = {}

		const cacheAddAll = vi.fn(async () => undefined)
		const cachePut = vi.fn(async () => undefined)
		const cacheOpen = vi.fn(async () => ({
			addAll: cacheAddAll,
			put: cachePut
		}))
		const cacheMatch = vi.fn(
			async (_request?: RequestInfo | URL) => undefined as Response | undefined
		)
		const cacheKeys = vi.fn(async () => [])
		const cacheDelete = vi.fn(async () => true)

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
			cacheOpen,
			cacheMatch,
			cachePut
		}
	}

	it('falls back to cached app shell for failed navigations', async () => {
		const { listeners, fetchMock, cacheMatch } =
			await setupServiceWorkerEnvironment()

		fetchMock.mockRejectedValueOnce(new Error('network down'))
		cacheMatch.mockImplementation(async (request?: RequestInfo | URL) => {
			if (request === '/') return new Response('app shell')
			return undefined
		})

		let responsePromise: Promise<Response> | undefined
		listeners.fetch?.({
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

		const response = await responsePromise
		expect(await response?.text()).toBe('app shell')
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})

	it('returns error response when static asset fetch fails and cache misses', async () => {
		const { listeners, fetchMock, cacheMatch } =
			await setupServiceWorkerEnvironment()

		fetchMock.mockRejectedValueOnce(new Error('network down'))
		cacheMatch.mockResolvedValueOnce(undefined)

		let responsePromise: Promise<Response> | undefined
		listeners.fetch?.({
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

		const response = await responsePromise
		expect(response?.type).toBe('error')
	})

	it('falls back to request-matched cache for non-static fetch failures', async () => {
		const { listeners, fetchMock, cacheMatch } =
			await setupServiceWorkerEnvironment()

		fetchMock.mockRejectedValueOnce(new Error('network down'))
		cacheMatch.mockResolvedValueOnce(new Response('cached payload'))

		let responsePromise: Promise<Response> | undefined
		listeners.fetch?.({
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

		const response = await responsePromise
		expect(await response?.text()).toBe('cached payload')
	})
})
