import { customAdaptiveDifficultyId } from '$lib/models/AdaptiveProfile'
import { parseQuizUrlQuery } from '$lib/models/quizQuerySchema'

export type LayoutPageTitleKey =
	| 'home'
	| 'quiz'
	| 'results'
	| 'settings'
	| 'default'

const layoutPageTitleKeys: readonly LayoutPageTitleKey[] = [
	'home',
	'quiz',
	'results',
	'settings',
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
	if (pageTitleKey === 'home' || pageTitleKey === 'default') {
		return messages.appTitleFull
	}

	if (pageTitleKey === 'quiz') {
		return `${messages.quizTitle} - ${messages.appTitle}`
	}

	if (pageTitleKey === 'results') {
		return `${messages.resultsTitle} - ${messages.appTitle}`
	}

	return `${messages.settingsTitle} - ${messages.appTitle}`
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

export function shouldShowDeterministicCopyLinkAction(search: string): boolean {
	const parsedDifficulty = parseQuizUrlQuery(
		new URLSearchParams(search)
	).difficulty
	return parsedDifficulty === customAdaptiveDifficultyId
}
