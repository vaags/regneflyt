import { describe, expect, it } from 'vitest'
import {
	evaluateDifficultyBounds,
	hasUnwantedCarryOrBorrow,
	OUT_OF_WINDOW_PENALTY,
	REPEAT_PENALTY,
	UNWANTED_CARRY_PENALTY
} from '$lib/helpers/difficultyScoring'
import { Operator } from '$lib/constants/Operator'
import type { PuzzlePartSet } from '$lib/models/Puzzle'

describe('difficultyScoring', () => {
	describe('penalty constants', () => {
		it('defines penalty hierarchy in expected order', () => {
			// Out-of-window penalty should be highest
			expect(OUT_OF_WINDOW_PENALTY).toBeGreaterThan(REPEAT_PENALTY)
			// Repeat penalty should be higher than carry penalty
			expect(REPEAT_PENALTY).toBeGreaterThan(UNWANTED_CARRY_PENALTY)
		})
	})

	describe('evaluateDifficultyBounds', () => {
		it('detects puzzles within difficulty bounds', () => {
			const parts: PuzzlePartSet = [
				{ generatedValue: 5, userDefinedValue: undefined },
				{ generatedValue: 3, userDefinedValue: undefined },
				{ generatedValue: 8, userDefinedValue: undefined }
			]

			const result = evaluateDifficultyBounds(Operator.Addition, parts, 5, 15)

			expect(result.tooEasy).toBe(false)
			expect(result.tooHard).toBe(false)
			expect(result.difficultyShortfall).toBe(0)
			expect(result.difficultyOvershoot).toBe(0)
		})

		it('detects puzzles too easy (below minimum difficulty)', () => {
			const parts: PuzzlePartSet = [
				{ generatedValue: 1, userDefinedValue: undefined },
				{ generatedValue: 1, userDefinedValue: undefined },
				{ generatedValue: 2, userDefinedValue: undefined }
			]

			const result = evaluateDifficultyBounds(Operator.Addition, parts, 30, 100)

			expect(result.tooEasy).toBe(true)
			expect(result.difficultyShortfall).toBeGreaterThan(0)
		})

		it('detects puzzles too hard (above maximum difficulty)', () => {
			const parts: PuzzlePartSet = [
				{ generatedValue: 99, userDefinedValue: undefined },
				{ generatedValue: 98, userDefinedValue: undefined },
				{ generatedValue: 197, userDefinedValue: undefined }
			]

			const result = evaluateDifficultyBounds(Operator.Addition, parts, 0, 20)

			expect(result.tooHard).toBe(true)
			expect(result.difficultyOvershoot).toBeGreaterThan(0)
		})
	})

	describe('hasUnwantedCarryOrBorrow', () => {
		it('returns false when preferNoCarry is false', () => {
			const parts: PuzzlePartSet = [
				{ generatedValue: 7, userDefinedValue: undefined },
				{ generatedValue: 5, userDefinedValue: undefined },
				{ generatedValue: 12, userDefinedValue: undefined }
			]

			const result = hasUnwantedCarryOrBorrow(parts, Operator.Addition, false)

			expect(result).toBe(false)
		})

		it('detects carries in addition when preferNoCarry is true', () => {
			// 17 + 15 = 32 (has carry in ones place)
			const parts: PuzzlePartSet = [
				{ generatedValue: 17, userDefinedValue: undefined },
				{ generatedValue: 15, userDefinedValue: undefined },
				{ generatedValue: 32, userDefinedValue: undefined }
			]

			const result = hasUnwantedCarryOrBorrow(parts, Operator.Addition, true)

			expect(result).toBe(true)
		})

		it('detects borrows in subtraction when preferNoCarry is true', () => {
			// 32 - 15 = 17 (has borrow in ones place: 2 < 5)
			const parts: PuzzlePartSet = [
				{ generatedValue: 32, userDefinedValue: undefined },
				{ generatedValue: 15, userDefinedValue: undefined },
				{ generatedValue: 17, userDefinedValue: undefined }
			]

			const result = hasUnwantedCarryOrBorrow(parts, Operator.Subtraction, true)

			expect(result).toBe(true)
		})
	})
})
