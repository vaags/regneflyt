import { describe, expect, it } from 'vitest'
import {
	appendQuizHistoryEntry,
	defaultPersistentFocusThresholds,
	getPersistentConceptWeakness,
	maxQuizHistoryEntries
} from '$lib/helpers/conceptHistoryHelper'
import type {
	QuizHistoryEntrySnapshot,
	QuizHistorySnapshot
} from '$lib/models/persistedStoreSchemas'

function createHistoryEntry(
	completedAt: number,
	concept: 'addition-basic' | 'subtraction-borrow',
	correct: number,
	total: number,
	avgDuration: number
): QuizHistoryEntrySnapshot {
	return {
		completedAt,
		conceptStats: [[concept, { correct, total, avgDuration }]]
	}
}

describe('conceptHistoryHelper', () => {
	it('caps quiz history to max entries', () => {
		let history: QuizHistorySnapshot = []

		for (let i = 0; i < maxQuizHistoryEntries + 2; i++) {
			history = appendQuizHistoryEntry(
				history,
				createHistoryEntry(i, 'addition-basic', 1, 1, 1)
			)
		}

		expect(history).toHaveLength(maxQuizHistoryEntries)
		expect(history[0]?.completedAt).toBe(2)
	})

	it('returns null when there is not enough repeated evidence', () => {
		const history: QuizHistorySnapshot = [
			createHistoryEntry(1, 'addition-basic', 1, 2, 1.2),
			createHistoryEntry(2, 'addition-basic', 1, 2, 1.1)
		]

		expect(getPersistentConceptWeakness(history)).toBeNull()
	})

	it('returns persistent weakness when repeated low accuracy crosses thresholds', () => {
		const history: QuizHistorySnapshot = [
			createHistoryEntry(1, 'addition-basic', 1, 2, 1.2),
			createHistoryEntry(2, 'addition-basic', 0, 1, 1.4),
			createHistoryEntry(3, 'addition-basic', 1, 2, 1.3)
		]

		const weakness = getPersistentConceptWeakness(history)
		expect(weakness).toMatchObject({
			concept: 'addition-basic',
			failureCount: 3,
			totalAttempts: 5,
			isSystematic: true
		})
		expect(weakness?.accuracy).toBeCloseTo(0.4)
	})

	it('returns null after recovery above threshold accuracy', () => {
		const history: QuizHistorySnapshot = [
			createHistoryEntry(1, 'addition-basic', 2, 3, 1),
			createHistoryEntry(2, 'addition-basic', 2, 3, 1),
			createHistoryEntry(3, 'addition-basic', 2, 3, 1)
		]

		const weakness = getPersistentConceptWeakness(history, {
			...defaultPersistentFocusThresholds,
			maxAccuracy: 0.6
		})

		expect(weakness).toBeNull()
	})
})
