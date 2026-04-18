import type { ThemePreference } from '$lib/stores'

type ThemeMediaQuery = {
	addEventListener(type: 'change', listener: () => void): void
	removeEventListener(type: 'change', listener: () => void): void
}

type LayoutWindowSyncTarget = {
	location: { search: string }
	matchMedia(query: string): ThemeMediaQuery
	addEventListener(type: string, listener: EventListener): void
	removeEventListener(type: string, listener: EventListener): void
}

export function setupLayoutMountSync(
	windowTarget: LayoutWindowSyncTarget,
	quizQueryUpdatedEvent: string,
	getThemePreference: () => ThemePreference,
	setCurrentSearch: (search: string) => void,
	applyThemePreference: (preference: ThemePreference) => void
): () => void {
	const mediaQuery = windowTarget.matchMedia('(prefers-color-scheme: dark)')
	const onThemePreferenceChange = () => {
		if (getThemePreference() === 'system') {
			applyThemePreference('system')
		}
	}
	const syncSearchFromLocation: EventListener = () => {
		setCurrentSearch(windowTarget.location.search)
	}
	const onQuizQueryUpdated: EventListener = (event) => {
		const detail = (event as CustomEvent<{ search?: string } | undefined>)
			.detail
		setCurrentSearch(detail?.search ?? windowTarget.location.search)
	}

	syncSearchFromLocation({} as Event)
	mediaQuery.addEventListener('change', onThemePreferenceChange)
	windowTarget.addEventListener('popstate', syncSearchFromLocation)
	windowTarget.addEventListener(quizQueryUpdatedEvent, onQuizQueryUpdated)

	return () => {
		mediaQuery.removeEventListener('change', onThemePreferenceChange)
		windowTarget.removeEventListener('popstate', syncSearchFromLocation)
		windowTarget.removeEventListener(quizQueryUpdatedEvent, onQuizQueryUpdated)
	}
}
