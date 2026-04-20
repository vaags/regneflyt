import type { ThemePreference } from '$lib/stores'

// ============================================================================
// Mount Sync Setup (from layoutMountSyncHelper.ts)
// ============================================================================

type ThemeMediaQuery = {
	addEventListener(type: 'change', listener: () => void): void
	removeEventListener(type: 'change', listener: EventListener): void
}

type LayoutWindowSyncTarget = {
	location: { search: string }
	matchMedia(query: string): ThemeMediaQuery
	addEventListener(type: string, listener: EventListener): void
	removeEventListener(type: string, listener: EventListener): void
}

function isSearchUpdateEvent(
	event: Event
): event is CustomEvent<{ search?: string } | undefined> {
	return event instanceof CustomEvent
}

export function setupLayoutMountSync(
	windowTarget: LayoutWindowSyncTarget,
	quizQueryUpdatedEvent: string,
	getThemePreference: () => ThemePreference,
	setCurrentSearch: (search: string) => void,
	applyThemePreference: (preference: ThemePreference) => void
): () => void {
	const mediaQuery = windowTarget.matchMedia('(prefers-color-scheme: dark)')
	const onThemePreferenceChange = (): void => {
		if (getThemePreference() === 'system') {
			applyThemePreference('system')
		}
	}
	const syncSearchFromLocation = (_event?: Event): void => {
		setCurrentSearch(windowTarget.location.search)
	}
	const onQuizQueryUpdated: EventListener = (event) => {
		const detail = isSearchUpdateEvent(event) ? event.detail : undefined
		setCurrentSearch(detail?.search ?? windowTarget.location.search)
	}

	syncSearchFromLocation()
	mediaQuery.addEventListener('change', onThemePreferenceChange)
	windowTarget.addEventListener('popstate', syncSearchFromLocation)
	windowTarget.addEventListener(quizQueryUpdatedEvent, onQuizQueryUpdated)

	return () => {
		mediaQuery.removeEventListener('change', onThemePreferenceChange)
		windowTarget.removeEventListener('popstate', syncSearchFromLocation)
		windowTarget.removeEventListener(quizQueryUpdatedEvent, onQuizQueryUpdated)
	}
}

// ============================================================================
// Mount Document Setup (from layoutMountDocumentHelper.ts)
// ============================================================================

type LayoutMountDocumentTarget = {
	body: { classList: { remove: (token: string) => void } }
	documentElement: {
		style: { setProperty: (property: string, value: string) => void }
	}
}

export function setupLayoutMountDocument(
	documentTarget: LayoutMountDocumentTarget,
	requestAnimationFrameFn: (callback: () => void) => unknown,
	themeTransitionMs: number,
	pageTransitionMs: number,
	initialLoadClass = 'initial-load'
): void {
	const clearInitialLoadClass = (): void => {
		documentTarget.body.classList.remove(initialLoadClass)
	}

	requestAnimationFrameFn(() => {
		requestAnimationFrameFn(clearInitialLoadClass)
	})

	documentTarget.documentElement.style.setProperty(
		'--theme-transition-ms',
		`${themeTransitionMs}ms`
	)
	documentTarget.documentElement.style.setProperty(
		'--page-transition-ms',
		`${pageTransitionMs}ms`
	)
}

// ============================================================================
// Keyboard Shortcuts (from layoutShortcutHelper.ts)
// ============================================================================

type ShortcutEvent = Pick<
	KeyboardEvent,
	| 'defaultPrevented'
	| 'repeat'
	| 'metaKey'
	| 'ctrlKey'
	| 'shiftKey'
	| 'key'
	| 'preventDefault'
>

export function isDevToolsShortcut(event: ShortcutEvent): boolean {
	return (
		(event.metaKey || event.ctrlKey) &&
		event.shiftKey &&
		event.key.toLowerCase() === 'd'
	)
}

export function isOnboardingShortcut(event: ShortcutEvent): boolean {
	return (
		(event.metaKey || event.ctrlKey) &&
		event.shiftKey &&
		event.key.toLowerCase() === 'o'
	)
}

export function handleDevToolsShortcut(
	event: ShortcutEvent,
	isProduction: boolean,
	toggle: () => void
): boolean {
	if (isProduction || event.defaultPrevented || event.repeat) return false
	if (!isDevToolsShortcut(event)) return false

	event.preventDefault()
	toggle()
	return true
}

export function handleOnboardingShortcut(
	event: ShortcutEvent,
	isProduction: boolean,
	show: () => void
): boolean {
	if (isProduction || event.defaultPrevented || event.repeat) return false
	if (!isOnboardingShortcut(event)) return false

	event.preventDefault()
	show()
	return true
}
