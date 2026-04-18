import {
	defaultAdaptiveSkillMap,
	adaptiveTuning
} from '$lib/models/AdaptiveProfile'
import type { Puzzle } from '$lib/models/Puzzle'
import type { QuizStats } from '$lib/models/QuizStats'
import type { Quiz } from '$lib/models/Quiz'
import type { AdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
import {
	parseAdaptiveSkillsSnapshot,
	parseLastResultsSnapshot,
	parsePracticeStreakSnapshot
} from '$lib/models/persistedStoreSchemas'

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

export type LastResults = {
	puzzleSet: Puzzle[]
	quizStats: QuizStats
	quiz: Quiz
	preQuizSkill?: AdaptiveSkillMap
}

export type PracticeStreak = {
	lastDate: string
	streak: number
}

function parseOnboardingCompletedSnapshot(value: unknown): boolean {
	return value === true
}

export type ThemePreference = 'system' | 'light' | 'dark'

function createPersistedStore<T>(
	key: string,
	getDefault: () => T,
	parseFromStorage: (parsed: unknown) => T,
	onChange?: (value: T) => void
) {
	function readFromStorage(): T {
		if (typeof window === 'undefined') return getDefault()
		try {
			const raw = window.localStorage.getItem(key)
			if (raw === null || raw === '') return getDefault()
			const parsed: unknown = JSON.parse(raw)
			return parseFromStorage(parsed)
		} catch (error) {
			console.warn(`Failed to load persisted store "${key}":`, error)
			return getDefault()
		}
	}

	function persistValue(value: T) {
		if (typeof window === 'undefined') return
		try {
			window.localStorage.setItem(key, JSON.stringify(value))
		} catch (error) {
			console.warn(`Failed to persist store "${key}":`, error)
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

// Exposed so components can show a warning banner on failure.
export const storageWriteError = createStateRef(false)

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
) {
	activeToast.current = {
		id: ++toastIdCounter,
		message,
		variant: options.variant ?? 'success',
		testId: options.testId,
		autoDismissMs: options.autoDismissMs
	}
}

export function dismissToast() {
	activeToast.current = undefined
}

export function toggleDevToolsVisibility() {
	if (!isDevEnvironment) return false
	const next = !devToolsEnabled.current
	devToolsEnabled.current = next
	return next
}

export function enableOnboardingPanelForDev() {
	if (!isDevEnvironment) return false
	onboardingCompleted.current = false
	return true
}

export const adaptiveSkills = createPersistedStore<AdaptiveSkillMap>(
	`${keyPrefix}regneflyt.adaptive-profiles.v1`,
	() => [...defaultAdaptiveSkillMap] as AdaptiveSkillMap,
	(parsed) => parseAdaptiveSkillsSnapshot(parsed)
)

export const overallSkill = createDerivedRef(() => {
	const skills = adaptiveSkills.current
	const count = adaptiveTuning.adaptiveAllOperatorCount
	let sum = 0
	for (let i = 0; i < count; i++) {
		sum += skills[i] ?? 0
	}
	return Math.round(sum / count)
})

export const lastResults = createPersistedStore<LastResults | null>(
	`${keyPrefix}regneflyt.last-results.v1`,
	() => null,
	(parsed) => parseLastResultsSnapshot(parsed)
)

export const practiceStreak = createPersistedStore<PracticeStreak>(
	`${keyPrefix}regneflyt.practice-streak.v1`,
	() => ({ lastDate: '', streak: 0 }),
	(parsed) => parsePracticeStreakSnapshot(parsed)
)

export const onboardingCompleted = createPersistedStore<boolean>(
	`${keyPrefix}regneflyt.onboarding-completed.v1`,
	() => false,
	(value) => parseOnboardingCompletedSnapshot(value)
)

export function updatePracticeStreak(): void {
	const today = new Date().toISOString().slice(0, 10)
	const current = practiceStreak.current
	if (current.lastDate === today) return

	const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
	if (current.lastDate === yesterday) {
		practiceStreak.current = {
			lastDate: today,
			streak: current.streak + 1
		}
		return
	}

	practiceStreak.current = { lastDate: today, streak: 1 }
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

export function clearAllProgress() {
	if (typeof window === 'undefined') return
	const prefixToMatch = `${keyPrefix}regneflyt.`
	const keysToRemove = Array.from(
		{ length: window.localStorage.length },
		(_, i) => window.localStorage.key(i)
	).filter(
		(key): key is string => key !== null && key.startsWith(prefixToMatch)
	)
	keysToRemove.forEach((key) => {
		window.localStorage.removeItem(key)
	})
	adaptiveSkills.reset()
	lastResults.reset()
	practiceStreak.reset()
	onboardingCompleted.reset()
}

export function applyTheme(preference: ThemePreference) {
	if (typeof document === 'undefined') return
	const root = document.documentElement
	const nextIsDark =
		preference === 'dark' ||
		(preference === 'system' &&
			window.matchMedia('(prefers-color-scheme: dark)').matches)
	if (root.classList.contains('dark') === nextIsDark) return

	latestThemeTransitionVersion += 1
	const transitionVersion = latestThemeTransitionVersion
	const applyThemeClass = () => root.classList.toggle('dark', nextIsDark)

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
