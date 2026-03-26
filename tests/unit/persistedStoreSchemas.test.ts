import { describe, expect, it } from 'vitest'
import {
	parseAdaptiveSkillsSnapshot,
	parseLastResultsSnapshot,
	parsePracticeStreakSnapshot
} from '$lib/models/persistedStoreSchemas'
import { createTestQuiz } from './component-setup'

function createStoredPuzzle() {
	return {
		parts: [
			{ generatedValue: 4, userDefinedValue: undefined },
			{ generatedValue: 5, userDefinedValue: undefined },
			{ generatedValue: 9, userDefinedValue: 9 }
		],
		duration: 1.2,
		isCorrect: true,
		operator: 0,
		unknownPartIndex: 2
	}
}

describe('persistedStoreSchemas', () => {
	it('round-trips adaptive skills snapshots through json serialization', () => {
		const snapshot = [12, 34, 56, 78]
		const serialized = JSON.stringify(snapshot)
		const parsed = parseAdaptiveSkillsSnapshot(JSON.parse(serialized))

		expect(parsed).toEqual([12, 34, 56, 78])
	})

	it('falls back to defaults when adaptive skills snapshot shape is invalid', () => {
		const parsed = parseAdaptiveSkillsSnapshot({ bad: 'data' })
		expect(parsed).toEqual([0, 0, 0, 0])
	})

	it('round-trips a valid lastResults snapshot', () => {
		const validSnapshot = {
			puzzleSet: [createStoredPuzzle()],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: createTestQuiz({ seed: 42, duration: 60 }),
			preQuizSkill: [10, 20, 30, 40],
			timedOut: false
		}

		const serialized = JSON.stringify(validSnapshot)
		const parsed = parseLastResultsSnapshot(JSON.parse(serialized))

		expect(parsed).toBeTruthy()
		expect(parsed?.quiz.seed).toBe(42)
		expect(parsed?.preQuizSkill).toEqual([10, 20, 30, 40])
	})

	it('returns null for malformed lastResults snapshot', () => {
		const parsed = parseLastResultsSnapshot({ quiz: { duration: 60 } })
		expect(parsed).toBeNull()
	})

	it('accepts legacy lastResults snapshots without newer optional fields', () => {
		const legacySnapshot = {
			puzzleSet: [createStoredPuzzle()],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: {
				seed: 123,
				duration: 60,
				showPuzzleProgressBar: true,
				allowNegativeAnswers: false,
				puzzleMode: 0,
				operatorSettings: createTestQuiz().operatorSettings
			}
		}

		const parsed = parseLastResultsSnapshot(legacySnapshot)

		expect(parsed).toBeTruthy()
		expect(parsed?.quiz.seed).toBe(123)
		expect(parsed?.timedOut).toBeUndefined()
		expect(parsed?.preQuizSkill).toBeUndefined()
	})

	it('returns null when quizStats have invalid semantic values', () => {
		const parsed = parseLastResultsSnapshot({
			puzzleSet: [createStoredPuzzle()],
			quizStats: {
				correctAnswerCount: 1.5,
				correctAnswerPercentage: 140,
				starCount: 1
			},
			quiz: createTestQuiz({ seed: 42, duration: 60 })
		})

		expect(parsed).toBeNull()
	})

	it('returns null when conceptStats include unknown concepts', () => {
		const parsed = parseLastResultsSnapshot({
			puzzleSet: [createStoredPuzzle()],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 50,
				starCount: 0,
				conceptStats: [
					[
						'unknown-concept',
						{
							concept: 'unknown-concept',
							correct: 0,
							total: 1,
							avgDuration: 1
						}
					]
				]
			},
			quiz: createTestQuiz({ seed: 42, duration: 60 })
		})

		expect(parsed).toBeNull()
	})

	it('normalizes legacy nullable replay fields to undefined', () => {
		const parsed = parseLastResultsSnapshot({
			puzzleSet: [createStoredPuzzle()],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: {
				...createTestQuiz({ seed: 42, duration: 60 }),
				selectedOperator: null,
				difficulty: null
			}
		})

		expect(parsed).toBeTruthy()
		expect(parsed?.quiz.selectedOperator).toBeUndefined()
		expect(parsed?.quiz.difficulty).toBeUndefined()
	})

	it('returns null when replay quiz enum fields are invalid', () => {
		const parsed = parseLastResultsSnapshot({
			puzzleSet: [createStoredPuzzle()],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: {
				...createTestQuiz({ seed: 42, duration: 60 }),
				puzzleMode: 9,
				selectedOperator: 99,
				difficulty: 7
			}
		})

		expect(parsed).toBeNull()
	})

	it('normalizes practiceStreak snapshots to integer non-negative streak values', () => {
		const parsed = parsePracticeStreakSnapshot({
			lastDate: '2026-03-26',
			streak: 4.9
		})

		expect(parsed).toEqual({ lastDate: '2026-03-26', streak: 4 })
	})

	it('falls back to default practiceStreak on invalid snapshot', () => {
		const parsed = parsePracticeStreakSnapshot({ lastDate: 123, streak: -1 })
		expect(parsed).toEqual({ lastDate: '', streak: 0 })
	})
})
