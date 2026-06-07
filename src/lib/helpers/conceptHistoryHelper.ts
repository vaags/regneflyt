import type {
	QuizHistoryEntrySnapshot,
	QuizHistorySnapshot
} from '$lib/models/persistedStoreSchemas'
import type { ConceptWeakness, PuzzleConcept } from '$lib/models/PuzzleConcept'

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

type AggregatedConceptHistory = {
	correct: number
	total: number
	quizCount: number
	weightedDurationSum: number
}

function aggregateConceptHistory(
	history: QuizHistorySnapshot
): Map<PuzzleConcept, AggregatedConceptHistory> {
	const aggregated = new Map<PuzzleConcept, AggregatedConceptHistory>()

	for (const entry of history) {
		for (const [concept, performance] of entry.conceptStats) {
			const existing = aggregated.get(concept) ?? {
				correct: 0,
				total: 0,
				quizCount: 0,
				weightedDurationSum: 0
			}

			aggregated.set(concept, {
				correct: existing.correct + performance.correct,
				total: existing.total + performance.total,
				quizCount: existing.quizCount + 1,
				weightedDurationSum:
					existing.weightedDurationSum +
					performance.avgDuration * performance.total
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

		const accuracy = stats.correct / stats.total
		if (
			stats.quizCount < thresholds.minQuizCount ||
			stats.total < thresholds.minAttempts ||
			accuracy >= thresholds.maxAccuracy
		) {
			continue
		}

		candidates.push({
			concept,
			failureCount: stats.total - stats.correct,
			totalAttempts: stats.total,
			accuracy,
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
