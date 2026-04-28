import { defaultAdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
import type { AdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
import {
	parseAdaptiveSkillsSnapshot,
	parseLastResultsSnapshot
} from '$lib/models/persistedStoreSchemas'
import type { LastResultsSnapshot } from '$lib/models/persistedStoreSchemas'

const keyPrefix = import.meta.env.DEV ? 'dev.' : ''
const isDevEnvironment = import.meta.env.DEV

type StateRef<T> = {
	get current(): T
	set current(value: T)
	set(value: T): void
	update(updater: (current: T) => T): void
}

type ReadonlyStateRef<T> = {
	readonly current: T
}

type PersistedStateRef<T> = StateRef<T> & {
	reset(): void
}

function createStateRef<T>(initialValue: T): StateRef<T> {
	let current = $state(initialValue)

	return {
		get current() {
			return current
		},
		set current(value: T) {
			current = value
		},
		set(value: T) {
			current = value
		},
		update(updater: (current: T) => T) {
			current = updater(current)
		}
	}
}

function createDerivedRef<T>(getValue: () => T): ReadonlyStateRef<T> {
	const current = $derived.by(getValue)

	return {
		get current() {
			return current
		}
	}
}

export type ToastVariant = 'success' | 'error'

export type ToastNotification = {
	id: number
	message: string
	variant: ToastVariant
	testId?: string | undefined
	autoDismissMs?: number | undefined
}

export type LastResults = LastResultsSnapshot

function parseOnboardingCompletedSnapshot(value: unknown): boolean {
	return value === true
}

export type ThemePreference = 'system' | 'light' | 'dark'

// Exposed so components can show a warning banner on failure.
export const storageWriteError = createStateRef(false)

function createPersistedStore<T>(
	key: string,
	getDefault: () => T,
	parseFromStorage: (parsed: unknown) => T,
	onChange?: (value: T) => void
): PersistedStateRef<T> {
	function readFromStorage(): T {
		if (typeof window === 'undefined') return getDefault()
		try {
			const raw = window.localStorage.getItem(key)
			if (raw === null || raw === '') return getDefault()
			const parsed: unknown = JSON.parse(raw)
			return parseFromStorage(parsed)
		} catch (error) {
			if (isDevEnvironment) {
				// eslint-disable-next-line no-console -- DEV-only diagnostic; production builds never reach this branch
				console.warn(`Failed to load persisted store "${key}":`, error)
			}
			return getDefault()
		}
	}

	function persistValue(value: T): void {
		if (typeof window === 'undefined') return
		try {
			window.localStorage.setItem(key, JSON.stringify(value))
		} catch (error) {
			if (isDevEnvironment) {
				// eslint-disable-next-line no-console -- DEV-only diagnostic; production builds never reach this branch
				console.warn(`Failed to persist store "${key}":`, error)
			}
			storageWriteError.current = true
		}
	}

	const state = createStateRef(readFromStorage())
	persistValue(state.current)
	onChange?.(state.current)

	return {
		get current() {
			return state.current
		},
		set current(value: T) {
			state.current = value
			persistValue(value)
			onChange?.(value)
		},
		set(value: T) {
			state.current = value
			persistValue(value)
			onChange?.(value)
		},
		update(updater: (current: T) => T) {
			state.current = updater(state.current)
			persistValue(state.current)
			onChange?.(state.current)
		},
		reset() {
			state.current = getDefault()
			persistValue(state.current)
			onChange?.(state.current)
		}
	}
}
const devToolsEnabled = createStateRef(false)

export const showDevTools = createDerivedRef(
	() => isDevEnvironment && devToolsEnabled.current
)

export const activeToast = createStateRef<ToastNotification | undefined>(
	undefined
)

let toastIdCounter = 0

export function showToast(
	message: string,
	options: {
		variant?: ToastVariant
		testId?: string
		autoDismissMs?: number
	} = {}
): void {
	activeToast.current = {
		id: ++toastIdCounter,
		message,
		variant: options.variant ?? 'success',
		testId: options.testId,
		autoDismissMs: options.autoDismissMs
	}
}

export function dismissToast(): void {
	activeToast.current = undefined
}

export function toggleDevToolsVisibility(): boolean {
	if (!isDevEnvironment) return false
	const next = !devToolsEnabled.current
	devToolsEnabled.current = next
	return next
}

export const adaptiveSkills = createPersistedStore<AdaptiveSkillMap>(
	`${keyPrefix}regneflyt.adaptive-profiles.v1`,
	() => [...defaultAdaptiveSkillMap] as AdaptiveSkillMap,
	(parsed) => parseAdaptiveSkillsSnapshot(parsed)
)

export const lastResults = createPersistedStore<LastResults | null>(
	`${keyPrefix}regneflyt.last-results.v1`,
	() => null,
	(parsed) => parseLastResultsSnapshot(parsed)
)

export const onboardingCompleted = createPersistedStore<boolean>(
	`${keyPrefix}regneflyt.onboarding-completed.v1`,
	() => false,
	(value) => parseOnboardingCompletedSnapshot(value)
)

export function enableOnboardingPanelForDev(): boolean {
	if (!isDevEnvironment) return false
	onboardingCompleted.current = false
	return true
}

let latestThemeTransitionVersion = 0

function isThemePreference(value: unknown): value is ThemePreference {
	return value === 'system' || value === 'light' || value === 'dark'
}

function sanitizeTheme(value: unknown): ThemePreference {
	return isThemePreference(value) ? value : 'system'
}

export const theme = createPersistedStore<ThemePreference>(
	`${keyPrefix}regneflyt.theme.v1`,
	() => 'system',
	sanitizeTheme,
	(value) => {
		if (typeof document === 'undefined') return
		document.cookie = `regneflyt-theme=${value};path=/;max-age=31536000;SameSite=Lax`
	}
)

export function clearAllProgress(): void {
	if (typeof window === 'undefined') return
	const prefixToMatch = `${keyPrefix}regneflyt.`
	const keysToRemove = Array.from(
		{ length: window.localStorage.length },
		(_, i) => window.localStorage.key(i)
	).filter(
		// eslint-disable-next-line @typescript-eslint/prefer-optional-chain -- key is narrowed to string by the null check; optional chain is redundant here
		(key): key is string => key !== null && key.startsWith(prefixToMatch)
	)
	keysToRemove.forEach((key) => {
		window.localStorage.removeItem(key)
	})
	adaptiveSkills.reset()
	lastResults.reset()
	onboardingCompleted.reset()
}

export function applyTheme(preference: ThemePreference): void {
	if (typeof document === 'undefined') return
	const root = document.documentElement
	const nextIsDark =
		preference === 'dark' ||
		(preference === 'system' &&
			window.matchMedia('(prefers-color-scheme: dark)').matches)
	if (root.classList.contains('dark') === nextIsDark) return

	latestThemeTransitionVersion += 1
	const transitionVersion = latestThemeTransitionVersion
	const applyThemeClass = (): boolean =>
		root.classList.toggle('dark', nextIsDark)

	const reducedMotion =
		typeof window.matchMedia === 'function' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches
	const startViewTransition:
		| ((updateCallback: () => void) => {
				finished: Promise<void>
		  })
		| undefined =
		'startViewTransition' in document
			? (
					document as Document & {
						startViewTransition: (updateCallback: () => void) => {
							finished: Promise<void>
						}
					}
				).startViewTransition
			: undefined

	if (startViewTransition === undefined || reducedMotion) {
		root.classList.toggle('theme-transitioning', false)
		applyThemeClass()
		return
	}

	root.classList.toggle('theme-transitioning', true)
	let transition: { finished: Promise<void> }
	try {
		transition = startViewTransition.call(document, applyThemeClass)
	} catch {
		root.classList.toggle('theme-transitioning', false)
		applyThemeClass()
		return
	}

	void transition.finished.finally(() => {
		if (transitionVersion !== latestThemeTransitionVersion) return
		root.classList.toggle('theme-transitioning', false)
	})
}
