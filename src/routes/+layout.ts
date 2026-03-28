import type { LayoutLoad, LayoutLoadEvent } from './$types'
import { browser } from '$app/environment'
import { setLocale, locales, type Locale } from '$lib/paraglide/runtime.js'

type PageTitleKey = 'home' | 'quiz' | 'results' | 'settings' | 'default'
type PageRouteId = Exclude<LayoutLoadEvent['route']['id'], null>

const pageTitleKeyByRouteId = {
	'/': 'home',
	'/quiz': 'quiz',
	'/results': 'results',
	'/settings': 'settings'
} as const satisfies Record<PageRouteId, Exclude<PageTitleKey, 'default'>>

export const load: LayoutLoad = ({ url, route }) => {
	return {
		pathname: url.pathname,
		pageTitleKey: route.id ? pageTitleKeyByRouteId[route.id] : 'default'
	}
}

if (browser) {
	const stored = document.cookie
		.split('; ')
		.find((c) => c.startsWith('PARAGLIDE_LOCALE='))
		?.split('=')[1]

	if (stored && locales.includes(stored as Locale)) {
		setLocale(stored as Locale, { reload: false })
	} else {
		const browserLang = navigator.language.split('-')[0]
		const match = locales.find((l) => l === browserLang)
		if (match) {
			setLocale(match, { reload: false })
		}
	}
}
