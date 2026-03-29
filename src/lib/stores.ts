import { writable, derived } from 'svelte/store'
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

// Exposed so components can subscribe and show a warning banner on failure.
export const storageWriteError = writable(false)

const devToolsEnabled = writable(false)

export const showDevTools = derived(
	devToolsEnabled,
	($devToolsEnabled) => isDevEnvironment && $devToolsEnabled
)

export function toggleDevToolsVisibility() {
	if (!isDevEnvironment) return false
	let next = false
	devToolsEnabled.update((current) => {
		next = !current
		return next
	})
	return next
}

export function clearAllProgress() {
	if (typeof window === 'undefined') return
	const keysToRemove: string[] = []
	const prefixToMatch = `${keyPrefix}regneflyt.`
	for (let i = 0; i < window.localStorage.length; i++) {
		const key = window.localStorage.key(i)
		if (key?.startsWith(prefixToMatch)) keysToRemove.push(key)
	}
	keysToRemove.forEach((key) => window.localStorage.removeItem(key))
	adaptiveSkills.reset()
	lastResults.reset()
	practiceStreak.reset()
}

export type LastResults = {
	puzzleSet: Puzzle[]
	quizStats: QuizStats
	quiz: Quiz
	preQuizSkill?: AdaptiveSkillMap
	timedOut?: boolean
}

export function createPersistedStore<T>(
	key: string,
	getDefault: () => T,
	sanitize?: (parsed: unknown) => T
) {
	function readFromStorage(): T {
		if (typeof window === 'undefined') return getDefault()
		try {
			const raw = window.localStorage.getItem(key)
			if (!raw) return getDefault()
			const parsed = JSON.parse(raw)
			return sanitize ? sanitize(parsed) : (parsed as T)
		} catch (e) {
			console.warn(`Failed to load persisted store "${key}":`, e)
			return getDefault()
		}
	}

	const store = writable<T>(readFromStorage())

	if (typeof window !== 'undefined') {
		store.subscribe((value) => {
			try {
				window.localStorage.setItem(key, JSON.stringify(value))
			} catch (e) {
				console.warn(`Failed to persist store "${key}":`, e)
				storageWriteError.set(true)
			}
		})
	}

	return {
		subscribe: store.subscribe,
		set: store.set,
		update: store.update,
		reset() {
			store.set(getDefault())
		}
	}
}

export const adaptiveSkills = createPersistedStore<AdaptiveSkillMap>(
	`${keyPrefix}regneflyt.adaptive-profiles.v1`,
	() => [...defaultAdaptiveSkillMap] as AdaptiveSkillMap,
	(parsed) => parseAdaptiveSkillsSnapshot(parsed)
)

export const overallSkill = derived(adaptiveSkills, ($skills) => {
	const count = adaptiveTuning.adaptiveAllOperatorCount
	let sum = 0
	for (let i = 0; i < count; i++) {
		sum += $skills[i] ?? 0
	}
	return Math.round(sum / count)
})

export const lastResults = createPersistedStore<LastResults | null>(
	`${keyPrefix}regneflyt.last-results.v1`,
	() => null,
	(parsed) => parseLastResultsSnapshot(parsed)
)

export type PracticeStreak = {
	lastDate: string
	streak: number
}

export const practiceStreak = createPersistedStore<PracticeStreak>(
	`${keyPrefix}regneflyt.practice-streak.v1`,
	() => ({ lastDate: '', streak: 0 }),
	(parsed) => parsePracticeStreakSnapshot(parsed)
)

export function updatePracticeStreak(): void {
	const today = new Date().toISOString().slice(0, 10)
	practiceStreak.update((current) => {
		if (current.lastDate === today) return current
		const yesterday = new Date(Date.now() - 86_400_000)
			.toISOString()
			.slice(0, 10)
		if (current.lastDate === yesterday) {
			return { lastDate: today, streak: current.streak + 1 }
		}
		return { lastDate: today, streak: 1 }
	})
}

export type ThemePreference = 'system' | 'light' | 'dark'

const validThemes: ThemePreference[] = ['system', 'light', 'dark']
let latestThemeTransitionVersion = 0

function sanitizeTheme(value: unknown): ThemePreference {
	return validThemes.includes(value as ThemePreference)
		? (value as ThemePreference)
		: 'system'
}

export const theme = createPersistedStore<ThemePreference>(
	`${keyPrefix}regneflyt.theme.v1`,
	() => 'system',
	sanitizeTheme
)

// Sync theme preference to cookie so hooks.server.ts can read it during SSR
if (typeof document !== 'undefined') {
	theme.subscribe((value) => {
		document.cookie = `regneflyt-theme=${value};path=/;max-age=31536000;SameSite=Lax`
	})
}

export function applyTheme(preference: ThemePreference) {
	if (typeof document === 'undefined') return
	const root = document.documentElement
	const nextIsDark =
		preference === 'dark' ||
		(preference === 'system' &&
			window.matchMedia('(prefers-color-scheme: dark)').matches)
	// Avoid unnecessary work and animation when the effective theme is unchanged.
	if (root.classList.contains('dark') === nextIsDark) return

	// Version transitions so stale `finished` handlers cannot clear state for newer runs.
	latestThemeTransitionVersion += 1
	const transitionVersion = latestThemeTransitionVersion
	const applyThemeClass = () => root.classList.toggle('dark', nextIsDark)

	const reducedMotion =
		typeof window.matchMedia === 'function' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches
	const startViewTransition = (
		document as Document & {
			startViewTransition?: (updateCallback: () => void) => {
				finished: Promise<void>
			}
		}
	).startViewTransition

	// Fall back to instant theme switch when transitions are unavailable or reduced.
	if (!startViewTransition || reducedMotion) {
		root.classList.toggle('theme-transitioning', false)
		applyThemeClass()
		return
	}

	root.classList.toggle('theme-transitioning', true)
	let transition: { finished: Promise<void> }
	try {
		transition = startViewTransition.call(document, applyThemeClass)
	} catch {
		// If transition startup fails, still apply the theme to keep behavior correct.
		root.classList.toggle('theme-transitioning', false)
		applyThemeClass()
		return
	}

	void transition.finished.finally(() => {
		if (transitionVersion !== latestThemeTransitionVersion) return
		root.classList.toggle('theme-transitioning', false)
	})
}
