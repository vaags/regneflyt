import type { LayoutLoad, LayoutLoadEvent } from './$types'
import type { LayoutPageTitleKey } from '$lib/helpers/layout/layoutNavigationHelper'
import { getLocale } from '$lib/paraglide/runtime.js'

type PageRouteId = Exclude<LayoutLoadEvent['route']['id'], null>

const pageTitleKeyByRouteId = {
	'/': 'home',
	'/quiz': 'quiz',
	'/results': 'results',
	'/settings': 'settings',
	'/simulation': 'simulation'
} as const satisfies Record<PageRouteId, Exclude<LayoutPageTitleKey, 'default'>>

export const load: LayoutLoad = ({ url, route }) => {
	return {
		pathname: url.pathname,
		search: url.search,
		canonicalUrl: `${url.origin}${url.pathname}`,
		pageTitleKey: route.id ? pageTitleKeyByRouteId[route.id] : 'default',
		locale: getLocale()
	}
}
