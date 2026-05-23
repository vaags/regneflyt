import { describe, expect, it } from 'vitest'
import { Operator } from '$lib/constants/Operator'
import type { PuzzlePartSet } from '$lib/models/Puzzle'
import { getPuzzleDifficulty } from '$lib/helpers/adaptiveDifficultyScoring'

function makeParts(a: number, b: number, result: number): PuzzlePartSet {
	return [
		{ generatedValue: a, userDefinedValue: undefined },
		{ generatedValue: b, userDefinedValue: undefined },
		{ generatedValue: result, userDefinedValue: undefined }
	] as PuzzlePartSet
}

/**
 * Golden regression tests for exact difficulty scores.
 * These snapshot the numeric output for specific puzzles to catch drift.
 */
describe('adaptiveProfile golden regressions: difficulty scoring', () => {
	describe('addition scoring', () => {
		it('golden score: 3 + 5 = 8 (small, no carry)', () => {
			const score = getPuzzleDifficulty(Operator.Addition, makeParts(3, 5, 8))
			expect(score).toMatchInlineSnapshot(`18`)
		})

		it('golden score: 45 + 38 = 83 (carry)', () => {
			const score = getPuzzleDifficulty(
				Operator.Addition,
				makeParts(45, 38, 83)
			)
			expect(score).toMatchInlineSnapshot(`90`)
		})

		it('golden score: 200 + 300 = 500 (trailing zeros, no carry)', () => {
			const score = getPuzzleDifficulty(
				Operator.Addition,
				makeParts(200, 300, 500)
			)
			expect(score).toMatchInlineSnapshot(`13`)
		})

		it('golden score: 99 + 1 = 100 (single carry)', () => {
			const score = getPuzzleDifficulty(
				Operator.Addition,
				makeParts(99, 1, 100)
			)
			expect(score).toMatchInlineSnapshot(`100`)
		})

		it('golden score: 567 + 489 = 1056 (multiple carries)', () => {
			const score = getPuzzleDifficulty(
				Operator.Addition,
				makeParts(567, 489, 1056)
			)
			expect(score).toMatchInlineSnapshot(`100`)
		})
	})

	describe('subtraction scoring', () => {
		it('golden score: 8 - 3 = 5 (small, no borrow)', () => {
			const score = getPuzzleDifficulty(
				Operator.Subtraction,
				makeParts(8, 3, 5)
			)
			expect(score).toMatchInlineSnapshot(`21`)
		})

		it('golden score: 52 - 38 = 14 (borrow)', () => {
			const score = getPuzzleDifficulty(
				Operator.Subtraction,
				makeParts(52, 38, 14)
			)
			expect(score).toMatchInlineSnapshot(`85`)
		})

		it('golden score: 100 - 1 = 99 (multiple borrows)', () => {
			const score = getPuzzleDifficulty(
				Operator.Subtraction,
				makeParts(100, 1, 99)
			)
			expect(score).toMatchInlineSnapshot(`98`)
		})

		it('golden score: 500 - 200 = 300 (trailing zeros)', () => {
			const score = getPuzzleDifficulty(
				Operator.Subtraction,
				makeParts(500, 200, 300)
			)
			expect(score).toMatchInlineSnapshot(`15`)
		})
	})

	describe('multiplication scoring', () => {
		it('golden score: 1 × 5 = 5 (identity table)', () => {
			const score = getPuzzleDifficulty(
				Operator.Multiplication,
				makeParts(1, 5, 5)
			)
			expect(score).toMatchInlineSnapshot(`13`)
		})

		it('golden score: 7 × 8 = 56 (hard table)', () => {
			const score = getPuzzleDifficulty(
				Operator.Multiplication,
				makeParts(7, 8, 56)
			)
			expect(score).toMatchInlineSnapshot(`80`)
		})

		it('golden score: 3 × 4 = 12 (easy table)', () => {
			const score = getPuzzleDifficulty(
				Operator.Multiplication,
				makeParts(3, 4, 12)
			)
			expect(score).toMatchInlineSnapshot(`38`)
		})

		it('golden score: 9 × 9 = 81 (hardest common table)', () => {
			const score = getPuzzleDifficulty(
				Operator.Multiplication,
				makeParts(9, 9, 81)
			)
			expect(score).toMatchInlineSnapshot(`67`)
		})

		it('golden score: 12 × 1 = 12 (identity factor)', () => {
			const score = getPuzzleDifficulty(
				Operator.Multiplication,
				makeParts(12, 1, 12)
			)
			expect(score).toMatchInlineSnapshot(`34`)
		})
	})

	describe('division scoring', () => {
		it('golden score: 10 ÷ 1 = 10 (identity divisor)', () => {
			const score = getPuzzleDifficulty(Operator.Division, makeParts(10, 1, 10))
			expect(score).toMatchInlineSnapshot(`10`)
		})

		it('golden score: 56 ÷ 7 = 8 (hard table)', () => {
			const score = getPuzzleDifficulty(Operator.Division, makeParts(56, 7, 8))
			expect(score).toMatchInlineSnapshot(`80`)
		})

		it('golden score: 12 ÷ 3 = 4 (easy table)', () => {
			const score = getPuzzleDifficulty(Operator.Division, makeParts(12, 3, 4))
			expect(score).toMatchInlineSnapshot(`38`)
		})

		it('golden score: 72 ÷ 8 = 9 (hard division)', () => {
			const score = getPuzzleDifficulty(Operator.Division, makeParts(72, 8, 9))
			expect(score).toMatchInlineSnapshot(`82`)
		})
	})
})
