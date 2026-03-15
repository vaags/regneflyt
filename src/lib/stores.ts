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

export function clearDevStorage() {
	if (typeof window === 'undefined') return
	const keysToRemove: string[] = []
	for (let i = 0; i < window.localStorage.length; i++) {
		const key = window.localStorage.key(i)
		if (key?.startsWith('dev.')) keysToRemove.push(key)
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
	return (
		Array.isArray(r.puzzleSet) &&
		!!r.quizStats &&
		!!r.quiz &&
		typeof r.quiz === 'object' &&
		'seed' in (r.quiz as object)
	)
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
