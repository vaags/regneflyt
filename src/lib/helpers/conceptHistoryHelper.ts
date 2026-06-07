import type {
	QuizHistoryEntrySnapshot,
	QuizHistorySnapshot
} from '$lib/models/persistedStoreSchemas'
import type { ConceptWeakness, PuzzleConcept } from '$lib/models/PuzzleConcept'
import { weaknessScoringConfig } from '$lib/helpers/weaknessScoringConfig'

export const maxQuizHistoryEntries = 12

export type PersistentFocusThresholds = {
	minQuizCount: number
	minAttempts: number
	maxAccuracy: number
}

export const defaultPersistentFocusThresholds: PersistentFocusThresholds = {
	minQuizCount: 3,
	minAttempts: 4,
	maxAccuracy: 0.65
}

const recencyDecayBase = Math.pow(
	0.5,
	1 / weaknessScoringConfig.recencyHalfLifeInQuizzes
)

type AggregatedConceptHistory = {
	correct: number
	total: number
	quizCount: number
	weightedDurationSum: number
	weightedCorrect: number
	weightedTotal: number
}

function aggregateConceptHistory(
	history: QuizHistorySnapshot
): Map<PuzzleConcept, AggregatedConceptHistory> {
	const aggregated = new Map<PuzzleConcept, AggregatedConceptHistory>()

	for (let entryIndex = 0; entryIndex < history.length; entryIndex++) {
		const entry = history[entryIndex]
		if (entry === undefined) continue
		const ageFromLatest = history.length - 1 - entryIndex
		const recencyWeight = Math.pow(recencyDecayBase, ageFromLatest)

		for (const [concept, performance] of entry.conceptStats) {
			const existing = aggregated.get(concept) ?? {
				correct: 0,
				total: 0,
				quizCount: 0,
				weightedDurationSum: 0,
				weightedCorrect: 0,
				weightedTotal: 0
			}

			aggregated.set(concept, {
				correct: existing.correct + performance.correct,
				total: existing.total + performance.total,
				quizCount: existing.quizCount + 1,
				weightedDurationSum:
					existing.weightedDurationSum +
					performance.avgDuration * performance.total,
				weightedCorrect:
					existing.weightedCorrect + performance.correct * recencyWeight,
				weightedTotal:
					existing.weightedTotal + performance.total * recencyWeight
			})
		}
	}

	return aggregated
}

export function appendQuizHistoryEntry(
	history: QuizHistorySnapshot,
	entry: QuizHistoryEntrySnapshot
): QuizHistorySnapshot {
	return [...history, entry].slice(-maxQuizHistoryEntries)
}

export function getPersistentConceptWeakness(
	history: QuizHistorySnapshot,
	thresholds: PersistentFocusThresholds = defaultPersistentFocusThresholds
): ConceptWeakness | null {
	const aggregated = aggregateConceptHistory(history)
	const candidates: ConceptWeakness[] = []

	for (const [concept, stats] of aggregated.entries()) {
		if (stats.total <= 0) continue

		const weightedAccuracy =
			stats.weightedTotal > 0
				? stats.weightedCorrect / stats.weightedTotal
				: stats.correct / stats.total
		if (
			stats.quizCount < thresholds.minQuizCount ||
			stats.total < thresholds.minAttempts ||
			weightedAccuracy >= thresholds.maxAccuracy
		) {
			continue
		}

		candidates.push({
			concept,
			failureCount: stats.total - stats.correct,
			totalAttempts: stats.total,
			accuracy: weightedAccuracy,
			avgDuration: stats.weightedDurationSum / stats.total,
			isSystematic: true
		})
	}

	if (candidates.length === 0) return null

	candidates.sort((a, b) => {
		if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy
		return b.totalAttempts - a.totalAttempts
	})

	return candidates[0] ?? null
}
