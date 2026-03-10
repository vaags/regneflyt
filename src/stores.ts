import { writable, derived } from 'svelte/store'
import {
	defaultAdaptiveSkillMap,
	adaptiveTuning
} from './models/AdaptiveProfile'
import { sanitizeAdaptiveSkillMap } from './helpers/adaptiveHelper'
import type { Puzzle } from './models/Puzzle'
import type { QuizStats } from './models/QuizStats'
import type { Quiz } from './models/Quiz'
import type { AdaptiveSkillMap } from './models/AdaptiveProfile'

const keyPrefix = import.meta.env.DEV ? 'dev.' : ''

export function clearDevStorage() {
	if (typeof window === 'undefined') return
	const keysToRemove = []
	for (let i = 0; i < window.localStorage.length; i++) {
		const key = window.localStorage.key(i)
		if (key?.startsWith('dev.')) keysToRemove.push(key)
	}
	keysToRemove.forEach((key) => window.localStorage.removeItem(key))
	adaptiveSkills.reset()
	lastResults.reset()
	totalCorrect.reset()
	totalAttempted.reset()
}

export type LastResults = {
	puzzleSet: Puzzle[]
	quizStats: QuizStats
	quiz: Quiz
	preQuizSkill?: AdaptiveSkillMap
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
		} catch {
			return getDefault()
		}
	}

	const store = writable<T>(readFromStorage())

	if (typeof window !== 'undefined') {
		store.subscribe((value) => {
			window.localStorage.setItem(key, JSON.stringify(value))
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

export const lastResults = createPersistedStore<LastResults | null>(
	`${keyPrefix}regneflyt.last-results.v1`,
	() => null,
	(parsed) => {
		const p = parsed as Partial<LastResults> | null
		if (!p || !Array.isArray(p.puzzleSet) || !p.quizStats || !p.quiz)
			return null
		return p as LastResults
	}
)

function sanitizeNonNegativeInt(value: unknown): number {
	const n = Number(value)
	return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
}

export const totalCorrect = createPersistedStore<number>(
	`${keyPrefix}regneflyt.total-correct.v1`,
	() => 0,
	sanitizeNonNegativeInt
)

export const totalAttempted = createPersistedStore<number>(
	`${keyPrefix}regneflyt.total-attempted.v1`,
	() => 0,
	sanitizeNonNegativeInt
)

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

export function applyTheme(preference: ThemePreference) {
	if (typeof document === 'undefined') return
	const isDark =
		preference === 'dark' ||
		(preference === 'system' &&
			window.matchMedia('(prefers-color-scheme: dark)').matches)
	document.documentElement.classList.toggle('dark', isDark)
	document.cookie = `regneflyt-theme=${preference};path=/;max-age=31536000;SameSite=Lax`
}
