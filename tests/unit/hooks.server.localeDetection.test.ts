import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cookieMaxAge, cookieName } from '$lib/paraglide/runtime.js'

vi.mock('$lib/paraglide/server.js', () => ({
	paraglideMiddleware: vi.fn(
		async (
			request: Request,
			resolve: (args: { request: Request; locale: string }) => unknown
		): Promise<Response> =>
			await (resolve({ request, locale: 'nb' }) as Response | Promise<Response>)
	)
}))

import { paraglideMiddleware } from '$lib/paraglide/server.js'
import { handle } from '../../src/hooks.server'

type CookieJar = {
	get: ReturnType<typeof vi.fn>
	set: ReturnType<typeof vi.fn>
}

function createCookieJar(
	values: Record<string, string | undefined>
): CookieJar {
	const get = vi.fn((name: string) => values[name])
	const set = vi.fn()
	return { get, set }
}

function createRequest(options: {
	acceptLanguage?: string
	cookieHeader?: string
	secFetchDest?: string
}): Request {
	const headers = new Headers()
	if (options.acceptLanguage != null) {
		headers.set('accept-language', options.acceptLanguage)
	}
	if (options.cookieHeader != null) {
		headers.set('cookie', options.cookieHeader)
	}
	if (options.secFetchDest != null) {
		headers.set('sec-fetch-dest', options.secFetchDest)
	}

	return new Request('https://example.com/', { headers })
}

async function renderTransformedHtml(options: {
	themeCookie?: 'system' | 'light' | 'dark'
	cookieHeader?: string
	acceptLanguage?: string
	secFetchDest?: string
}): Promise<string> {
	const cookies = createCookieJar({
		'regneflyt-theme': options.themeCookie
	})
	const requestOptions: {
		acceptLanguage?: string
		cookieHeader?: string
		secFetchDest?: string
	} = {}
	if (options.acceptLanguage !== undefined) {
		requestOptions.acceptLanguage = options.acceptLanguage
	}
	if (options.cookieHeader !== undefined) {
		requestOptions.cookieHeader = options.cookieHeader
	}
	if (options.secFetchDest !== undefined) {
		requestOptions.secFetchDest = options.secFetchDest
	}
	const request = createRequest(requestOptions)

	const resolve = vi.fn(
		(
			_,
			resolveOptions?: {
				transformPageChunk?: (args: { html: string }) => string
			}
		) => {
			const html =
				'<!doctype html><html lang="nb"><head></head><body></body></html>'
			const transformedHtml = resolveOptions?.transformPageChunk
				? resolveOptions.transformPageChunk({ html })
				: html
			return new Response(transformedHtml)
		}
	)

	const response = await handle({
		event: { request, cookies } as never,
		resolve: resolve as never
	} as never)

	return response.text()
}

describe('hooks.server locale detection integration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('sets locale cookie and seeds middleware request for document navigations', async () => {
		const cookies = createCookieJar({
			'regneflyt-theme': 'system'
		})
		const request = createRequest({
			acceptLanguage: 'fr-CA, en;q=0.8',
			cookieHeader: 'regneflyt-theme=system',
			secFetchDest: 'document'
		})

		const resolve = vi.fn(() => new Response('ok'))

		await handle({
			event: { request, cookies } as never,
			resolve
		} as never)

		expect(cookies.set).toHaveBeenCalledWith(cookieName, 'fr', {
			path: '/',
			maxAge: cookieMaxAge,
			sameSite: 'lax'
		})

		const requestUsedForParaglide =
			vi.mocked(paraglideMiddleware).mock.calls[0]?.[0]
		expect(requestUsedForParaglide).toBeInstanceOf(Request)
		expect(requestUsedForParaglide?.headers.get('cookie')).toContain(
			'regneflyt-theme=system'
		)
		expect(requestUsedForParaglide?.headers.get('cookie')).toContain(
			`${cookieName}=fr`
		)
	})

	it('does not set locale cookie for non-document requests', async () => {
		const cookies = createCookieJar({})
		const request = createRequest({
			acceptLanguage: 'fr-CA, fr;q=0.9'
		})

		const resolve = vi.fn(() => new Response('ok'))

		await handle({
			event: { request, cookies } as never,
			resolve
		} as never)

		expect(cookies.set).not.toHaveBeenCalled()

		const requestUsedForParaglide =
			vi.mocked(paraglideMiddleware).mock.calls[0]?.[0]
		expect(requestUsedForParaglide?.headers.get('cookie')).toBeNull()
	})

	it('injects only the system theme detection script for system theme cookie', async () => {
		const html = await renderTransformedHtml({
			themeCookie: 'system',
			cookieHeader: 'regneflyt-theme=system'
		})

		expect(html).toContain("matchMedia('(prefers-color-scheme:dark)')")
		expect(html).not.toContain('@media(prefers-color-scheme:dark)')
		expect(html).not.toContain('background:linear-gradient')
	})

	it('adds dark class for dark theme cookie without injecting inline theme styles', async () => {
		const html = await renderTransformedHtml({
			themeCookie: 'dark',
			cookieHeader: 'regneflyt-theme=dark'
		})

		expect(html).toContain('<html class="dark" lang="nb"')
		expect(html).not.toContain('background:linear-gradient')
	})
})
