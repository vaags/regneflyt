import { expect, test } from '@playwright/test'
import { requestDocumentHtml } from './e2eHelpers'

async function requestSsrDocumentWithLanguage(
	playwright: Parameters<typeof requestDocumentHtml>[0],
	baseURL: Parameters<typeof requestDocumentHtml>[1],
	acceptLanguage: string,
	extraHTTPHeaders?: Record<string, string>
) {
	return requestDocumentHtml(playwright, baseURL, {
		headers: {
			'accept-language': acceptLanguage,
			'sec-fetch-dest': 'document'
		},
		...(extraHTTPHeaders ? { extraHTTPHeaders } : {})
	})
}

function getHtmlLang(html: string): string | undefined {
	const match = /<html[^>]*\blang="([^"]+)"/i.exec(html)
	return match?.[1]
}

test.describe('SSR locale request handling', () => {
	test('uses Accept-Language for first visit and persists locale cookie', async ({
		playwright,
		baseURL
	}) => {
		const { ok, html, setCookieHeaders } = await requestSsrDocumentWithLanguage(
			playwright,
			baseURL,
			'fr-CA,fr;q=0.9,en;q=0.8'
		)

		expect(ok).toBe(true)
		expect(getHtmlLang(html)).toBe('fr')
		expect(
			setCookieHeaders.some((cookie) =>
				cookie.startsWith('PARAGLIDE_LOCALE=fr;')
			)
		).toBe(true)
	})

	test('keeps existing locale cookie precedence over Accept-Language', async ({
		playwright,
		baseURL
	}) => {
		const { ok, html, setCookieHeaders } = await requestSsrDocumentWithLanguage(
			playwright,
			baseURL,
			'fr-CA,fr;q=0.9',
			{ cookie: 'PARAGLIDE_LOCALE=en' }
		)

		expect(ok).toBe(true)
		expect(getHtmlLang(html)).toBe('en')
		expect(
			setCookieHeaders.some((cookie) => cookie.startsWith('PARAGLIDE_LOCALE='))
		).toBe(false)
	})

	test('falls back to base locale when no supported language is provided', async ({
		playwright,
		baseURL
	}) => {
		const { ok, html } = await requestSsrDocumentWithLanguage(
			playwright,
			baseURL,
			'pt-BR,it;q=0.8'
		)

		expect(ok).toBe(true)
		expect(getHtmlLang(html)).toBe('nb')
	})

	test('maps nn/no Accept-Language variants to nb and persists cookie', async ({
		playwright,
		baseURL
	}) => {
		const { ok, html, setCookieHeaders } = await requestSsrDocumentWithLanguage(
			playwright,
			baseURL,
			'nn-NO,no;q=0.8,en;q=0.7'
		)

		expect(ok).toBe(true)
		expect(getHtmlLang(html)).toBe('nb')
		expect(
			setCookieHeaders.some((cookie) =>
				cookie.startsWith('PARAGLIDE_LOCALE=nb;')
			)
		).toBe(true)
	})
})
