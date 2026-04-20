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
			quiz: createTestQuiz({
				seed: 42,
				duration: 60,
				adaptiveSkillByOperator: [12, 24, 36, 48]
			}),
			preQuizSkill: [10, 20, 30, 40]
		}

		const serialized = JSON.stringify(validSnapshot)
		const parsed = parseLastResultsSnapshot(JSON.parse(serialized))

		expect(parsed).toBeTruthy()
		expect(parsed?.quiz.seed).toBe(42)
		expect(parsed?.quiz.adaptiveSkillByOperator).toEqual([12, 24, 36, 48])
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

	it('returns null when replay quiz operatorSettings tuple is incomplete', () => {
		const incompleteOperatorSettings = createTestQuiz({
			seed: 42,
			duration: 60
		}).operatorSettings.slice(0, 3)

		const parsed = parseLastResultsSnapshot({
			puzzleSet: [createStoredPuzzle()],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: {
				...createTestQuiz({ seed: 42, duration: 60 }),
				operatorSettings: incompleteOperatorSettings
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

	it('preserves quiz adaptiveSkillByOperator through round-trip serialization', () => {
		const skillsAfterQuiz: [number, number, number, number] = [25, 50, 75, 100]
		const snapshot = {
			puzzleSet: [createStoredPuzzle()],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: createTestQuiz({
				seed: 99,
				duration: 60,
				adaptiveSkillByOperator: skillsAfterQuiz
			})
		}

		const serialized = JSON.stringify(snapshot)
		const parsed = parseLastResultsSnapshot(JSON.parse(serialized))

		expect(parsed?.quiz.adaptiveSkillByOperator).toEqual(skillsAfterQuiz)
	})

	it('falls back to default adaptiveSkillByOperator for legacy snapshots without the field', () => {
		// Simulate old snapshot that was persisted before adaptiveSkillByOperator was added
		const legacySnapshot = {
			puzzleSet: [createStoredPuzzle()],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: {
				seed: 42,
				duration: 60,
				showPuzzleProgressBar: true,
				allowNegativeAnswers: false,
				puzzleMode: 0,
				operatorSettings: createTestQuiz().operatorSettings
				// Note: no adaptiveSkillByOperator field
			}
		}

		const parsed = parseLastResultsSnapshot(legacySnapshot)

		expect(parsed).toBeTruthy()
		expect(parsed?.quiz.adaptiveSkillByOperator).toEqual([0, 0, 0, 0])
	})

	it('clamps adaptiveSkillByOperator values to valid range [0, 100]', () => {
		// Values outside range should be clamped
		const invalidSnapshot = {
			puzzleSet: [createStoredPuzzle()],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: createTestQuiz({
				seed: 42,
				duration: 60,
				adaptiveSkillByOperator: [-10, 50, 150, 100] as [
					number,
					number,
					number,
					number
				]
			})
		}

		const serialized = JSON.stringify(invalidSnapshot)
		const parsed = parseLastResultsSnapshot(JSON.parse(serialized))

		expect(parsed?.quiz.adaptiveSkillByOperator).toEqual([0, 50, 100, 100])
	})

	it('returns null when adaptiveSkillByOperator has incorrect length', () => {
		const invalidSnapshot = {
			puzzleSet: [createStoredPuzzle()],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: {
				...createTestQuiz({ seed: 42, duration: 60 }),
				adaptiveSkillByOperator: [10, 20, 30] // Only 3 instead of 4
			}
		}

		const parsed = parseLastResultsSnapshot(invalidSnapshot)
		expect(parsed).toBeNull()
	})
})
