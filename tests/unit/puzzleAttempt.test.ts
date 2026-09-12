import { describe, expect, it } from 'vitest'
import { Operator } from '#lib/domain/arithmetic/operator.ts'
import type { Puzzle } from '#lib/domain/puzzle-generation/puzzle.ts'
import { completePuzzleAttempt } from '#lib/domain/quiz/puzzleAttempt.ts'
import { regneflytThresholdSeconds } from '#lib/domain/quiz/quizScoring.ts'
import type { OperatorSkillMap } from '#lib/domain/skill-progression/skillModel.ts'

function createPuzzle(userDefinedValue: number, generatedValue = 7): Puzzle {
	return {
		parts: [
			{ generatedValue: 3, userDefinedValue: undefined },
			{ generatedValue: 4, userDefinedValue: undefined },
			{ generatedValue, userDefinedValue }
		],
		unknownPartIndex: 2,
		duration: 0,
		isCorrect: undefined,
		operator: Operator.Addition
	}
}

function createSkills(): OperatorSkillMap {
	return [10, 20, 30, 40]
}

describe('completePuzzleAttempt', () => {
	it('completes a correct attempt and advances the streak', () => {
		const puzzle = createPuzzle(7)
		const skillByOperator = createSkills()

		const result = completePuzzleAttempt({
			puzzle,
			skillByOperator,
			durationSeconds: 2.5,
			consecutiveCorrect: 2
		})

		expect(result.puzzle).not.toBe(puzzle)
		expect(puzzle.isCorrect).toBeUndefined()
		expect(puzzle.duration).toBe(0)
		expect(result.puzzle.isCorrect).toBe(true)
		expect(result.puzzle.duration).toBe(2.5)
		expect(result.consecutiveCorrect).toBe(3)
		expect(result.awardedStar).toBe(true)
		expect(skillByOperator[Operator.Addition]).toBeGreaterThan(10)
	})

	it('completes an incorrect attempt and resets the streak', () => {
		const skillByOperator = createSkills()

		const result = completePuzzleAttempt({
			puzzle: createPuzzle(8),
			skillByOperator,
			durationSeconds: 1,
			consecutiveCorrect: 4
		})

		expect(result.puzzle.isCorrect).toBe(false)
		expect(result.consecutiveCorrect).toBe(0)
		expect(result.awardedStar).toBe(false)
		expect(skillByOperator[Operator.Addition]).toBeLessThan(10)
	})

	it.each([undefined, -0])(
		'treats an incomplete %s answer as incorrect',
		(userDefinedValue) => {
			const puzzle = createPuzzle(0, 0)
			puzzle.parts[puzzle.unknownPartIndex].userDefinedValue = userDefinedValue

			const result = completePuzzleAttempt({
				puzzle,
				skillByOperator: createSkills(),
				durationSeconds: 1,
				consecutiveCorrect: 1
			})

			expect(result.puzzle.isCorrect).toBe(false)
			expect(result.consecutiveCorrect).toBe(0)
		}
	)

	it('awards a star at the threshold but not above it', () => {
		const atThreshold = completePuzzleAttempt({
			puzzle: createPuzzle(7),
			skillByOperator: createSkills(),
			durationSeconds: regneflytThresholdSeconds,
			consecutiveCorrect: 0
		})
		const aboveThreshold = completePuzzleAttempt({
			puzzle: createPuzzle(7),
			skillByOperator: createSkills(),
			durationSeconds: regneflytThresholdSeconds + 0.001,
			consecutiveCorrect: 0
		})

		expect(atThreshold.awardedStar).toBe(true)
		expect(aboveThreshold.awardedStar).toBe(false)
	})
})
