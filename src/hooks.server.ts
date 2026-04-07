import type { Handle } from '@sveltejs/kit'
import { paraglideMiddleware } from '$lib/paraglide/server.js'
import {
	cookieMaxAge,
	cookieName,
	extractLocaleFromHeader,
	type Locale
} from '$lib/paraglide/runtime.js'
import { applyLanguageTagAliasesToAcceptLanguage } from '$lib/helpers/acceptLanguageAliasHelper'
import { localeAliasByLanguageTag } from '$lib/constants/LocaleAlias'

// This script must stay in sync with the CSP hash in svelte.config.js
const systemScript = `<script>(function(){if(matchMedia('(prefers-color-scheme:dark)').matches)document.documentElement.classList.add('dark')})()</script>`

function applyHtmlLocale(html: string, locale: string): string {
	return html.replace(/<html lang="[^"]*"/, `<html lang="${locale}"`)
}

function isDocumentNavigationRequest(request: Request): boolean {
	const secFetchDest = request.headers.get('sec-fetch-dest')
	return request.mode === 'navigate' || secFetchDest === 'document'
}

function getPreferredLocaleFromHeaderWithAliases(
	request: Request
): Locale | undefined {
	const { aliasedHeader, changed } = applyLanguageTagAliasesToAcceptLanguage(
		request.headers.get('accept-language'),
		localeAliasByLanguageTag
	)

	if (!changed || aliasedHeader === null)
		return extractLocaleFromHeader(request)

	const headers = new Headers(request.headers)
	headers.set('accept-language', aliasedHeader)
	return extractLocaleFromHeader(new Request(request, { headers }))
}

export const handle: Handle = async ({ event, resolve }) => {
	const themeCookie = event.cookies.get('regneflyt-theme')
	const isDocumentNavigation = isDocumentNavigationRequest(event.request)
	const localeCookie = event.cookies.get(cookieName)
	const preferredLocale =
		localeCookie === undefined && isDocumentNavigation
			? getPreferredLocaleFromHeaderWithAliases(event.request)
			: undefined

	const requestForLocaleDetection =
		preferredLocale !== undefined
			? (() => {
					const headers = new Headers(event.request.headers)
					const existingCookieHeader = event.request.headers.get('cookie')
					const localeCookieValue = `${cookieName}=${preferredLocale}`
					headers.set(
						'cookie',
						existingCookieHeader !== null && existingCookieHeader !== ''
							? `${existingCookieHeader}; ${localeCookieValue}`
							: localeCookieValue
					)
					return new Request(event.request, { headers })
				})()
			: event.request

	if (preferredLocale) {
		event.cookies.set(cookieName, preferredLocale, {
			path: '/',
			maxAge: cookieMaxAge,
			sameSite: 'lax'
		})
	}

	return paraglideMiddleware(requestForLocaleDetection, ({ locale }) => {
		return resolve(event, {
			transformPageChunk: ({ html }) => {
				const htmlWithLocale = applyHtmlLocale(html, locale)

				if (themeCookie === 'dark') {
					return htmlWithLocale.replace(
						'<html lang=',
						'<html class="dark" lang='
					)
				}
				if (themeCookie === 'light') {
					return htmlWithLocale
				}
				// 'system' or no cookie: detect OS preference client-side
				return htmlWithLocale.replace('</head>', `${systemScript}</head>`)
			}
		})
	})
}
