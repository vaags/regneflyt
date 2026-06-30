export type LayoutLocationSnapshot = {
	pathname: string
	search: string
}

export type LayoutPageTitleKey =
	| 'home'
	| 'quiz'
	| 'results'
	| 'settings'
	| 'simulation'
	| 'default'

const layoutPageTitleKeys: readonly LayoutPageTitleKey[] = [
	'home',
	'quiz',
	'results',
	'settings',
	'simulation',
	'default'
]

export type LayoutPageTitleMessages = {
	appTitleFull: string
	appTitle: string
	quizTitle: string
	resultsTitle: string
	settingsTitle: string
}

function isLayoutPageTitleKey(value: string): value is LayoutPageTitleKey {
	return layoutPageTitleKeys.some((key) => key === value)
}

export function normalizeLayoutPageTitleKey(
	pageTitleKey: string
): LayoutPageTitleKey {
	if (isLayoutPageTitleKey(pageTitleKey)) {
		return pageTitleKey
	}

	// Preserve previous behavior for unknown keys.
	return 'settings'
}

export function getLayoutPageTitle(
	pageTitleKey: LayoutPageTitleKey,
	messages: LayoutPageTitleMessages
): string {
	switch (pageTitleKey) {
		case 'home':
		case 'default':
			return messages.appTitleFull
		case 'quiz':
			return `${messages.quizTitle} - ${messages.appTitle}`
		case 'results':
			return `${messages.resultsTitle} - ${messages.appTitle}`
		case 'settings':
			return `${messages.settingsTitle} - ${messages.appTitle}`
		case 'simulation':
			return `Simulation - ${messages.appTitle}`
		default: {
			const exhaustiveCheck: never = pageTitleKey
			return exhaustiveCheck
		}
	}
}

export function getStickyGlobalNavTransitionName(
	pathname: string,
	suppressTransitionName: boolean
): string | undefined {
	if (suppressTransitionName) return undefined
	if (pathname === '/') return 'sticky-global-nav-menu'
	if (pathname === '/results') return 'sticky-global-nav-results'
	if (pathname === '/settings') return 'sticky-global-nav-settings'
	return undefined
}
