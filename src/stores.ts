import { writable } from 'svelte/store'
import {
	defaultAdaptiveSkillMap,
	sanitizeAdaptiveSkillMap,
	type AdaptiveProfiles
} from './models/AdaptiveProfile'
import type { Puzzle } from './models/Puzzle'
import type { QuizScores } from './models/QuizScores'
import type { Quiz } from './models/Quiz'
import type { AdaptiveSkillMap } from './models/AdaptiveProfile'

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

export const highscore = createPersistedStore<number>(
	'regneflyt.highscore.v1',
	() => 0,
	(parsed) => {
		const n = Number(parsed)
		return Number.isFinite(n) && n >= 0 ? n : 0
	}
)

export const adaptiveProfiles = createPersistedStore<AdaptiveProfiles>(
	'regneflyt.adaptive-profiles.v1',
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

export const lastResults = createPersistedStore<LastResults | null>(
	'regneflyt.last-results.v1',
	() => null,
	(parsed) => {
		const p = parsed as Partial<LastResults> | null
		if (!p || !Array.isArray(p.puzzleSet) || !p.quizScores || !p.quiz)
			return null
		return p as LastResults
	}
)
