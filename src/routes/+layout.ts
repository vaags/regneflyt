import type { LayoutLoad, LayoutLoadEvent } from './$types'
import { getLocale } from '$lib/paraglide/runtime.js'

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
		search: url.search,
		canonicalUrl: `${url.origin}${url.pathname}`,
		pageTitleKey: route.id ? pageTitleKeyByRouteId[route.id] : 'default',
		locale: getLocale()
	}
}
