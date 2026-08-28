import { describe, expect, it } from 'vitest'
import { Operator } from '#lib/constants/Operator.ts'
import type { PuzzlePartSet } from '#lib/models/Puzzle.ts'
import {
	countCarriesOrBorrows,
	getDifficultyRatio,
	getPuzzleDifficulty
} from '#lib/helpers/adaptiveDifficultyScoring.ts'

function makeParts(a: number, b: number, result: number): PuzzlePartSet {
	return [
		{ generatedValue: a, userDefinedValue: undefined },
		{ generatedValue: b, userDefinedValue: undefined },
		{ generatedValue: result, userDefinedValue: undefined }
	] as PuzzlePartSet
}

describe('adaptiveDifficultyScoring', () => {
	it('scores larger no-carry addition as harder than smaller no-carry addition', () => {
		const small = getPuzzleDifficulty(Operator.Addition, makeParts(1, 2, 3))
		const medium = getPuzzleDifficulty(Operator.Addition, makeParts(42, 35, 77))
		const large = getPuzzleDifficulty(
			Operator.Addition,
			makeParts(333, 444, 777)
		)

		expect(small).toBeLessThanOrEqual(9)
		expect(medium).toBeGreaterThan(30)
		expect(medium).toBeLessThan(70)
		expect(large).toBeGreaterThan(80)
		expect(medium).toBeGreaterThan(small)
		expect(large).toBeGreaterThan(small)
		expect(large).toBeGreaterThan(medium)
	})

	it('scores addition with carry as harder than larger no-carry addition', () => {
		const noCarry = getPuzzleDifficulty(Operator.Addition, makeParts(20, 9, 29))
		const withCarry = getPuzzleDifficulty(
			Operator.Addition,
			makeParts(16, 6, 22)
		)

		expect(withCarry).toBeGreaterThan(noCarry)
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

	it('scores subtraction difficulty by operand magnitude', () => {
		const easy = getPuzzleDifficulty(Operator.Subtraction, makeParts(3, 1, 2))
		const medium = getPuzzleDifficulty(
			Operator.Subtraction,
			makeParts(52, 31, 21)
		)
		const hard = getPuzzleDifficulty(
			Operator.Subtraction,
			makeParts(100, 95, 5)
		)

		expect(medium).toBeGreaterThan(30)
		expect(medium).toBeLessThan(85)
		expect(hard).toBeGreaterThan(80)
		expect(easy).toBeLessThan(medium)
		expect(medium).toBeLessThan(hard)
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

	it('saturates the hardest configured multiplication pattern', () => {
		expect(
			getPuzzleDifficulty(Operator.Multiplication, makeParts(14, 9, 126))
		).toBe(100)
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

	it('computes difficulty ratio with a zero-safe offset and clamps at one', () => {
		expect(getDifficultyRatio(50, 50)).toBe(1)
		expect(getDifficultyRatio(25, 50)).toBeCloseTo(26 / 51, 2)
		expect(getDifficultyRatio(80, 40)).toBe(1)
		expect(getDifficultyRatio(0, 100)).toBeCloseTo(1 / 101, 2)
		expect(getDifficultyRatio(5, 0)).toBe(1)
		expect(getDifficultyRatio(0, 0)).toBe(1)
		expect(getDifficultyRatio(-10, 100)).toBe(0)
	})

	it('returns bounded scores for deterministic extreme puzzles', () => {
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
			expect(Number.isInteger(score)).toBe(true)
			expect(score).toBeGreaterThanOrEqual(0)
			expect(score).toBeLessThanOrEqual(100)
		}
	})
})
