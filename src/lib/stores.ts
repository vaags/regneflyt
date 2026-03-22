import { writable, derived } from 'svelte/store'
import {
	defaultAdaptiveSkillMap,
	adaptiveTuning
} from '$lib/models/AdaptiveProfile'
import { sanitizeAdaptiveSkillMap } from '$lib/helpers/adaptiveHelper'
import type { Puzzle } from '$lib/models/Puzzle'
import type { QuizStats } from '$lib/models/QuizStats'
import type { Quiz } from '$lib/models/Quiz'
import type { AdaptiveSkillMap } from '$lib/models/AdaptiveProfile'

const keyPrefix = import.meta.env.DEV ? 'dev.' : ''

// Exposed so components can subscribe and show a warning banner on failure.
export const storageWriteError = writable(false)

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

/**
 * @deprecated Use clearAllProgress() instead. This function only works in dev mode.
 */
export function clearDevStorage() {
	return clearAllProgress()
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
	(parsed) => sanitizeAdaptiveSkillMap(parsed)
)

export const overallSkill = derived(adaptiveSkills, ($skills) => {
	const count = adaptiveTuning.adaptiveAllOperatorCount
	let sum = 0
	for (let i = 0; i < count; i++) {
		sum += $skills[i] ?? 0
	}
	return Math.round(sum / count)
})

function isLastResults(p: unknown): p is LastResults {
	if (!p || typeof p !== 'object') return false
	const r = p as Record<string, unknown>
	return Array.isArray(r.puzzleSet) && !!r.quizStats && isReplayableQuiz(r.quiz)
}

function isReplayableQuiz(quiz: unknown): quiz is Quiz {
	if (!quiz || typeof quiz !== 'object') return false
	const q = quiz as Record<string, unknown>

	if (!Number.isFinite(q.seed)) return false
	if (!Number.isFinite(q.duration)) return false
	if (typeof q.showPuzzleProgressBar !== 'boolean') return false
	if (typeof q.allowNegativeAnswers !== 'boolean') return false
	if (!Number.isFinite(q.puzzleMode)) return false
	if (
		q.selectedOperator !== undefined &&
		q.selectedOperator !== null &&
		!Number.isFinite(q.selectedOperator)
	)
		return false
	if (
		q.difficulty !== undefined &&
		q.difficulty !== null &&
		!Number.isFinite(q.difficulty)
	)
		return false

	if (!Array.isArray(q.operatorSettings) || q.operatorSettings.length < 4)
		return false

	for (let i = 0; i < 4; i++) {
		const settings = q.operatorSettings[i]
		if (!settings || typeof settings !== 'object') return false
		const s = settings as Record<string, unknown>
		if (!Array.isArray(s.range) || s.range.length !== 2) return false
		if (!Number.isFinite(s.range[0]) || !Number.isFinite(s.range[1]))
			return false
		if (!Array.isArray(s.possibleValues)) return false
		if (s.possibleValues.some((v) => !Number.isFinite(v))) return false
	}

	return true
}

export const lastResults = createPersistedStore<LastResults | null>(
	`${keyPrefix}regneflyt.last-results.v1`,
	() => null,
	(parsed) => (isLastResults(parsed) ? parsed : null)
)

export type PracticeStreak = {
	lastDate: string
	streak: number
}

function isPracticeStreak(p: unknown): p is PracticeStreak {
	if (!p || typeof p !== 'object') return false
	const r = p as Record<string, unknown>
	return (
		typeof r.lastDate === 'string' &&
		typeof r.streak === 'number' &&
		Number.isFinite(r.streak) &&
		r.streak >= 0
	)
}

function sanitizePracticeStreak(parsed: unknown): PracticeStreak {
	if (!isPracticeStreak(parsed)) return { lastDate: '', streak: 0 }
	return { lastDate: parsed.lastDate, streak: Math.floor(parsed.streak) }
}

export const practiceStreak = createPersistedStore<PracticeStreak>(
	`${keyPrefix}regneflyt.practice-streak.v1`,
	() => ({ lastDate: '', streak: 0 }),
	sanitizePracticeStreak
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
	const isDark =
		preference === 'dark' ||
		(preference === 'system' &&
			window.matchMedia('(prefers-color-scheme: dark)').matches)
	document.documentElement.classList.toggle('dark', isDark)
}
