import { beforeEach, describe, expect, it, vi } from 'vitest'

type PostHandler = (event: {
	request: Request
	getClientAddress: () => string
}) => Promise<Response>

async function loadPostHandler(): Promise<PostHandler> {
	vi.resetModules()
	const mod = await import('../../src/routes/api/sw-telemetry/+server')
	return mod.POST as unknown as PostHandler
}

function createJsonRequest(body: unknown): Request {
	return new Request('http://localhost/api/sw-telemetry', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	})
}

describe('sw telemetry endpoint', () => {
	beforeEach(() => {
		vi.restoreAllMocks()
	})

	it('accepts a valid telemetry payload', async () => {
		const POST = await loadPostHandler()
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

		const response = await POST({
			request: createJsonRequest({
				event: 'sw_fetch_fallback',
				details: { path: '/offline.html' },
				source: 'service-worker'
			}),
			getClientAddress: () => '127.0.0.1'
		})

		expect(response.status).toBe(202)
		expect(warnSpy).toHaveBeenCalledOnce()
	})

	it('returns 400 for invalid json', async () => {
		const POST = await loadPostHandler()

		const response = await POST({
			request: new Request('http://localhost/api/sw-telemetry', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: '{invalid-json}'
			}),
			getClientAddress: () => '127.0.0.1'
		})

		expect(response.status).toBe(400)
		expect(await response.json()).toMatchObject({ error: 'invalid-json' })
	})

	it('returns 400 for missing event', async () => {
		const POST = await loadPostHandler()

		const response = await POST({
			request: createJsonRequest({ details: { foo: 'bar' } }),
			getClientAddress: () => '127.0.0.1'
		})

		expect(response.status).toBe(400)
		expect(await response.json()).toMatchObject({ error: 'missing-event' })
	})

	it('returns 413 when details payload is too large', async () => {
		const POST = await loadPostHandler()

		const response = await POST({
			request: createJsonRequest({
				event: 'sw_fetch_fallback',
				details: { big: 'x'.repeat(5000) }
			}),
			getClientAddress: () => '127.0.0.1'
		})

		expect(response.status).toBe(413)
		expect(await response.json()).toMatchObject({ error: 'details-too-large' })
	})

	it('returns 429 when client exceeds rate limit', async () => {
		const POST = await loadPostHandler()
		vi.spyOn(console, 'warn').mockImplementation(() => {})

		let lastResponse: Response | undefined
		for (let i = 0; i < 61; i += 1) {
			lastResponse = await POST({
				request: createJsonRequest({ event: 'sw_fetch_fallback' }),
				getClientAddress: () => '192.168.0.2'
			})
		}

		expect(lastResponse).toBeDefined()
		expect(lastResponse!.status).toBe(429)
		expect(await lastResponse!.json()).toMatchObject({ error: 'rate-limited' })
	})
})
