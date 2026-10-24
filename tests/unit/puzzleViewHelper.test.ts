import { describe, expect, it } from 'vitest'
import { Operator } from '#lib/domain/arithmetic/operator.ts'
import type { Puzzle } from '#lib/domain/puzzle-generation/puzzle.ts'
import {
	hasMissingPuzzleInput,
	trimRecentPuzzleHistory
} from '#lib/helpers/quiz/puzzleViewHelper.ts'

function createPuzzle(): Puzzle {
	return {
		parts: [
			{ generatedValue: 3, userDefinedValue: 1 },
			{ generatedValue: 4, userDefinedValue: 2 },
			{ generatedValue: 7, userDefinedValue: 3 }
		],
		unknownPartIndex: 2,
		duration: 4.2,
		isCorrect: true,
		operator: Operator.Addition
	}
}

describe('puzzleViewHelper', () => {
	describe('trimRecentPuzzleHistory', () => {
		it('keeps only the latest puzzles up to max history size', () => {
			const p1 = createPuzzle()
			const p2 = createPuzzle()
			const p3 = createPuzzle()

			const recent = trimRecentPuzzleHistory([p1, p2], p3, 2)

			expect(recent).toEqual([p2, p3])
		})
	})

	describe('hasMissingPuzzleInput', () => {
		it('returns true for undefined or negative zero user values', () => {
			const undefinedValuePuzzle = createPuzzle()
			undefinedValuePuzzle.parts[2].userDefinedValue = undefined

			const negativeZeroPuzzle = createPuzzle()
			negativeZeroPuzzle.parts[2].userDefinedValue = -0

			expect(hasMissingPuzzleInput(undefinedValuePuzzle)).toBe(true)
			expect(hasMissingPuzzleInput(negativeZeroPuzzle)).toBe(true)
		})

		it('returns false when the unknown part has a regular number', () => {
			const puzzle = createPuzzle()
			puzzle.parts[2].userDefinedValue = 7

			expect(hasMissingPuzzleInput(puzzle)).toBe(false)
		})
	})
})
