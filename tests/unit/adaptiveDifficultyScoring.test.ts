import { describe, expect, it } from 'vitest'
import { Operator } from '$lib/constants/Operator'
import type { PuzzlePartSet } from '$lib/models/Puzzle'
import {
	countCarriesOrBorrows,
	getDifficultyRatio,
	getPuzzleDifficulty
} from '$lib/helpers/adaptiveDifficultyScoring'

function makeParts(a: number, b: number, result: number): PuzzlePartSet {
	return [
		{ generatedValue: a, userDefinedValue: undefined },
		{ generatedValue: b, userDefinedValue: undefined },
		{ generatedValue: result, userDefinedValue: undefined }
	] as PuzzlePartSet
}

describe('adaptiveDifficultyScoring', () => {
	it('scores larger no-carry addition as harder than smaller no-carry addition', () => {
		const small = getPuzzleDifficulty(Operator.Addition, makeParts(2, 3, 5))
		const large = getPuzzleDifficulty(Operator.Addition, makeParts(20, 8, 28))

		expect(large).toBeGreaterThan(small)
	})

	it('scores subtraction with borrow as harder than no-borrow subtraction', () => {
		const noBorrow = getPuzzleDifficulty(
			Operator.Subtraction,
			makeParts(52, 31, 21)
		)
		const withBorrow = getPuzzleDifficulty(
			Operator.Subtraction,
			makeParts(52, 38, 14)
		)

		expect(withBorrow).toBeGreaterThan(noBorrow)
	})

	it('scores identity-table multiplication easier than non-identity table', () => {
		const identity = getPuzzleDifficulty(
			Operator.Multiplication,
			makeParts(1, 10, 10)
		)
		const nonIdentity = getPuzzleDifficulty(
			Operator.Multiplication,
			makeParts(9, 10, 90)
		)

		expect(identity).toBeLessThan(nonIdentity)
	})

	it('scores harder division patterns higher than easy identity division', () => {
		const easy = getPuzzleDifficulty(Operator.Division, makeParts(10, 1, 10))
		const hard = getPuzzleDifficulty(Operator.Division, makeParts(72, 8, 9))

		expect(hard).toBeGreaterThan(easy)
	})

	it('counts carries and borrows correctly for known cases', () => {
		expect(countCarriesOrBorrows(58, 67, false)).toBe(2)
		expect(countCarriesOrBorrows(42, 19, true)).toBe(1)
		expect(countCarriesOrBorrows(100, 19, true)).toBe(2)
	})

	it('computes difficulty ratio with expected clamp behavior', () => {
		expect(getDifficultyRatio(50, 50)).toBe(1)
		expect(getDifficultyRatio(10, 50)).toBeLessThan(1)
		expect(getDifficultyRatio(200, 0)).toBe(1)
		expect(getDifficultyRatio(-10, 100)).toBeGreaterThanOrEqual(0)
	})

	it('always returns difficulty scores in [0, 100]', () => {
		const puzzles: Array<[Operator, PuzzlePartSet]> = [
			[Operator.Addition, makeParts(1, 1, 2)],
			[Operator.Addition, makeParts(999, 1, 1000)],
			[Operator.Subtraction, makeParts(1000, 999, 1)],
			[Operator.Subtraction, makeParts(999, 1, 998)],
			[Operator.Multiplication, makeParts(1, 1, 1)],
			[Operator.Multiplication, makeParts(12, 10, 120)],
			[Operator.Division, makeParts(10, 1, 10)],
			[Operator.Division, makeParts(120, 12, 10)]
		]

		for (const [operator, parts] of puzzles) {
			const score = getPuzzleDifficulty(operator, parts)
			expect(score).toBeGreaterThanOrEqual(0)
			expect(score).toBeLessThanOrEqual(100)
		}
	})
})
