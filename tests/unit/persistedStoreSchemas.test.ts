import { describe, expect, it } from 'vitest'
import {
	parseOperatorSkillsSnapshot,
	parseLastResultsSnapshot
} from '#lib/models/persistedStoreSchemas.ts'
import type { OperatorSkillMap } from '#lib/domain/skill-progression/skillModel.ts'
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

function createHistoricalStoredQuiz(
	overrides: Record<string, unknown> = {}
): Record<string, unknown> {
	const quiz = createTestQuiz()
	const { skillByOperator: _currentSkillByOperator, ...historicalQuiz } = quiz

	return { ...historicalQuiz, ...overrides }
}

describe('persistedStoreSchemas', () => {
	it('round-trips operator skill snapshots through json serialization', () => {
		const snapshot = [12, 34, 56, 78]
		const serialized = JSON.stringify(snapshot)
		const parsed = parseOperatorSkillsSnapshot(JSON.parse(serialized))

		expect(parsed).toEqual([12, 34, 56, 78])
	})

	it('falls back to defaults when operator skill snapshot shape is invalid', () => {
		const parsed = parseOperatorSkillsSnapshot({ bad: 'data' })
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
				skillByOperator: [12, 24, 36, 48]
			}),
			preQuizSkill: [10, 20, 30, 40]
		}

		const serialized = JSON.stringify(validSnapshot)
		const parsed = parseLastResultsSnapshot(JSON.parse(serialized))

		expect(parsed).toBeTruthy()
		expect(parsed?.quiz.seed).toBe(42)
		expect(parsed?.quiz.skillByOperator).toEqual([12, 24, 36, 48])
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

	it('preserves current quiz skillByOperator through round-trip serialization', () => {
		const skillsAfterQuiz: OperatorSkillMap = [25, 50, 75, 100]
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
				skillByOperator: skillsAfterQuiz
			})
		}

		const serialized = JSON.stringify(snapshot)
		const parsed = parseLastResultsSnapshot(JSON.parse(serialized))

		expect(parsed?.quiz.skillByOperator).toEqual(skillsAfterQuiz)
	})

	it('normalizes historical adaptiveSkillByOperator snapshots', () => {
		const historicalSnapshot = {
			puzzleSet: [createStoredPuzzle()],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: createHistoricalStoredQuiz({
				seed: 99,
				duration: 60,
				adaptiveSkillByOperator: [12, 24, 36, 48]
			})
		}

		const parsed = parseLastResultsSnapshot(historicalSnapshot)

		expect(parsed?.quiz.skillByOperator).toEqual([12, 24, 36, 48])
	})

	it('prefers current skillByOperator when both persisted fields exist', () => {
		const transitionalSnapshot = {
			puzzleSet: [createStoredPuzzle()],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: {
				...createTestQuiz({
					seed: 99,
					duration: 60,
					skillByOperator: [10, 20, 30, 40]
				}),
				adaptiveSkillByOperator: [1, 2, 3, 4]
			}
		}

		const parsed = parseLastResultsSnapshot(transitionalSnapshot)

		expect(parsed?.quiz.skillByOperator).toEqual([10, 20, 30, 40])
	})

	it('falls back to default skillByOperator for legacy snapshots without the field', () => {
		// Simulate old snapshot that was persisted before skillByOperator was added
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
				// No current or historical operator-skill field.
			}
		}

		const parsed = parseLastResultsSnapshot(legacySnapshot)

		expect(parsed).toBeTruthy()
		expect(parsed?.quiz.skillByOperator).toEqual([0, 0, 0, 0])
	})

	it('clamps skillByOperator values to valid range [0, 100]', () => {
		// Values outside range should be clamped
		const invalidSnapshot = {
			puzzleSet: [createStoredPuzzle()],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: createHistoricalStoredQuiz({
				seed: 42,
				duration: 60,
				adaptiveSkillByOperator: [-10, 50, 150, 100] as OperatorSkillMap
			})
		}

		const serialized = JSON.stringify(invalidSnapshot)
		const parsed = parseLastResultsSnapshot(JSON.parse(serialized))

		expect(parsed?.quiz.skillByOperator).toEqual([0, 50, 100, 100])
	})

	it('returns null when historical adaptiveSkillByOperator has incorrect length', () => {
		const invalidSnapshot = {
			puzzleSet: [createStoredPuzzle()],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: createHistoricalStoredQuiz({
				seed: 42,
				duration: 60,
				adaptiveSkillByOperator: [10, 20, 30] // Only 3 instead of 4
			})
		}

		const parsed = parseLastResultsSnapshot(invalidSnapshot)
		expect(parsed).toBeNull()
	})

	it('normalizes non-finite adaptive skill values independently', () => {
		const parsedWithNaN = parseOperatorSkillsSnapshot([10, Number.NaN, 20, 30])
		const parsedWithInfinity = parseOperatorSkillsSnapshot([
			10,
			Number.POSITIVE_INFINITY,
			20,
			30
		])

		expect(parsedWithNaN).toEqual([10, 0, 20, 30])
		expect(parsedWithInfinity).toEqual([10, 0, 20, 30])
	})

	it('normalizes coercible legacy adaptive skill values', () => {
		expect(parseOperatorSkillsSnapshot([null, true, '', '75'])).toEqual([
			0, 1, 0, 75
		])
	})

	it('normalizes coercible legacy adaptive skills in last results', () => {
		const parsed = parseLastResultsSnapshot({
			puzzleSet: [createStoredPuzzle()],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: createHistoricalStoredQuiz({
				seed: 42,
				duration: 60,
				adaptiveSkillByOperator: [null, true, '', '75']
			})
		})

		expect(parsed?.quiz.skillByOperator).toEqual([0, 1, 0, 75])
	})

	it('falls back to default operator skills for non-array snapshots', () => {
		expect(parseOperatorSkillsSnapshot('')).toEqual([0, 0, 0, 0])
		expect(parseOperatorSkillsSnapshot(null)).toEqual([0, 0, 0, 0])
	})

	it('returns null when lastResults is missing puzzleSet', () => {
		const parsed = parseLastResultsSnapshot({
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: createTestQuiz({ seed: 42, duration: 60 })
		})

		expect(parsed).toBeNull()
	})

	it('returns null for lastResults snapshots with malformed quiz field types', () => {
		const parsed = parseLastResultsSnapshot({
			puzzleSet: [createStoredPuzzle()],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: {
				...createTestQuiz({ seed: 42, duration: 60 }),
				seed: '',
				duration: ''
			}
		})

		expect(parsed).toBeNull()
	})

	it('returns null for non-object lastResults payloads', () => {
		expect(parseLastResultsSnapshot('')).toBeNull()
		expect(parseLastResultsSnapshot(null)).toBeNull()
	})
})
