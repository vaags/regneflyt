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
	// Side-effect boundary: all window interactions are injected via windowTarget
	// so this function can be tested without touching global browser objects.
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
	requestAnimationFrameFn: (callback: () => void) => number,
	themeTransitionMs: number,
	pageTransitionMs: number,
	initialLoadClass = 'initial-load'
): void {
	// Side-effect boundary: DOM writes are funneled through documentTarget and
	// requestAnimationFrameFn to keep behavior explicit and mockable.
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
	toggle: () => void
): boolean {
	if (event.defaultPrevented || event.repeat) return false
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

// ============================================================================
// Multi-tap dev tools gesture (mobile-friendly alternative to Cmd+Shift+D)
// ============================================================================

const DEV_TAP_REQUIRED = 7
const DEV_TAP_WINDOW_MS = 3000

export type DevTapState = {
	count: number
	firstTapTime: number
}

export function createDevTapState(): DevTapState {
	return { count: 0, firstTapTime: 0 }
}

/**
 * Process a tap on the dev-tools gesture target.
 * Returns `true` when the tap threshold is reached and `toggle` is called.
 */
export function handleDevTap(
	state: DevTapState,
	now: number,
	toggle: () => void
): boolean {
	if (state.count === 0 || now - state.firstTapTime > DEV_TAP_WINDOW_MS) {
		state.count = 1
		state.firstTapTime = now
		return false
	}

	state.count++

	if (state.count >= DEV_TAP_REQUIRED) {
		state.count = 0
		state.firstTapTime = 0
		toggle()
		return true
	}

	return false
}
