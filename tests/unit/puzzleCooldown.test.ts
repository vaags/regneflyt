import { describe, expect, it } from 'vitest'
import { Operator } from '#lib/domain/arithmetic/operator.ts'
import type { Puzzle } from '#lib/domain/puzzle-generation/puzzle.ts'
import { PuzzleMode } from '#lib/domain/puzzle-generation/puzzleMode.ts'
import { getCooldownStepsRemaining } from '#lib/domain/puzzle-generation/puzzleCooldown.ts'

function puzzle(operator: Operator, isCorrect: boolean): Puzzle {
	return {
		parts: [
			{ generatedValue: 1, userDefinedValue: undefined },
			{ generatedValue: 1, userDefinedValue: undefined },
			{ generatedValue: 2, userDefinedValue: undefined }
		],
		duration: 3,
		isCorrect,
		operator,
		puzzleMode: PuzzleMode.Normal,
		unknownPartIndex: 2
	}
}

describe('getCooldownStepsRemaining', () => {
	it('returns zero without a same-operator error', () => {
		expect(
			getCooldownStepsRemaining(
				[puzzle(Operator.Subtraction, false)],
				Operator.Addition,
				2
			)
		).toBe(0)
	})

	it('counts same-operator puzzles since the most recent error', () => {
		const history = [
			puzzle(Operator.Addition, false),
			puzzle(Operator.Subtraction, true),
			puzzle(Operator.Addition, true)
		]

		expect(getCooldownStepsRemaining(history, Operator.Addition, 3)).toBe(2)
	})

	it('expires after enough same-operator puzzles', () => {
		const history = [
			puzzle(Operator.Addition, false),
			puzzle(Operator.Addition, true),
			puzzle(Operator.Addition, true)
		]

		expect(getCooldownStepsRemaining(history, Operator.Addition, 2)).toBe(0)
	})

	it('supports disabled cooldown', () => {
		expect(
			getCooldownStepsRemaining(
				[puzzle(Operator.Addition, false)],
				Operator.Addition,
				0
			)
		).toBe(0)
	})
})
