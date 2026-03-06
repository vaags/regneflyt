import { writable, derived } from 'svelte/store'
import {
	defaultAdaptiveSkillMap,
	adaptiveTuning,
	type AdaptiveProfiles
} from './models/AdaptiveProfile'
import { sanitizeAdaptiveSkillMap } from './helpers/adaptiveHelper'
import type { Puzzle } from './models/Puzzle'
import type { QuizScores } from './models/QuizScores'
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
	adaptiveProfiles.reset()
	lastResults.reset()
}

export type LastResults = {
	puzzleSet: Puzzle[]
	quizScores: QuizScores
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

export const adaptiveProfiles = createPersistedStore<AdaptiveProfiles>(
	`${keyPrefix}regneflyt.adaptive-profiles.v1`,
	() => ({
		adaptive: [...defaultAdaptiveSkillMap],
		custom: [...defaultAdaptiveSkillMap]
	}),
	(parsed) => {
		const p = parsed as Partial<AdaptiveProfiles>
		return {
			adaptive: sanitizeAdaptiveSkillMap(p.adaptive),
			custom: sanitizeAdaptiveSkillMap(p.custom)
		}
	}
)

export const overallSkill = derived(adaptiveProfiles, ($profiles) => {
	const count = adaptiveTuning.adaptiveAllOperatorCount
	let sum = 0
	for (let i = 0; i < count; i++) {
		sum += Math.max($profiles.adaptive[i] ?? 0, $profiles.custom[i] ?? 0)
	}
	return Math.round(sum / count)
})

export const lastResults = createPersistedStore<LastResults | null>(
	`${keyPrefix}regneflyt.last-results.v1`,
	() => null,
	(parsed) => {
		const p = parsed as Partial<LastResults> | null
		if (!p || !Array.isArray(p.puzzleSet) || !p.quizScores || !p.quiz)
			return null
		return p as LastResults
	}
)
