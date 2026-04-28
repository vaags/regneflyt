import { expect, test } from '@playwright/test'
import { requestDocumentHtml } from './e2eHelpers'

function getBaseUrlOrThrow(baseURL: string | undefined): string {
	if (baseURL == null) {
		throw new Error('Expected Playwright baseURL to be configured')
	}

	return baseURL
}

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

function getTitle(html: string): string | undefined {
	const match = /<title>([^<]*)<\/title>/i.exec(html)
	return match?.[1]?.trim()
}

function getMetaContent(
	html: string,
	params: { name?: string; property?: string }
): string | undefined {
	const identifier =
		params.name !== undefined
			? `name=["']${params.name}["']`
			: `property=["']${params.property}["']`
	const pattern = new RegExp(
		`<meta[^>]*${identifier}[^>]*content=["']([^"']*)["'][^>]*>` +
			`|<meta[^>]*content=["']([^"']*)["'][^>]*${identifier}[^>]*>`,
		'i'
	)
	const match = pattern.exec(html)
	return match?.[1] ?? match?.[2]
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

	test('renders og metadata aligned with localized title and description', async ({
		playwright,
		baseURL
	}) => {
		const { ok, html } = await requestSsrDocumentWithLanguage(
			playwright,
			baseURL,
			'fr-CA,fr;q=0.9,en;q=0.8'
		)

		expect(ok).toBe(true)
		expect(getHtmlLang(html)).toBe('fr')

		const title = getTitle(html)
		const description = getMetaContent(html, { name: 'description' })
		const ogTitle = getMetaContent(html, { property: 'og:title' })
		const ogDescription = getMetaContent(html, { property: 'og:description' })
		const ogUrl = getMetaContent(html, { property: 'og:url' })

		expect(title).toBeTruthy()
		expect(description).toBeTruthy()
		expect(ogTitle).toBe(title)
		expect(ogDescription).toBe(description)
		expect(ogUrl).toBe(getBaseUrlOrThrow(baseURL) + '/')
	})
})
