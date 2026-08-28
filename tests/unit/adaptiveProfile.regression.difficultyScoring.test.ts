import { describe, expect, it } from 'vitest'
import { Operator } from '#lib/constants/Operator.ts'
import type { PuzzlePartSet } from '#lib/models/Puzzle.ts'
import { getPuzzleDifficulty } from '#lib/helpers/adaptiveDifficultyScoring.ts'

function makeParts(a: number, b: number, result: number): PuzzlePartSet {
	return [
		{ generatedValue: a, userDefinedValue: undefined },
		{ generatedValue: b, userDefinedValue: undefined },
		{ generatedValue: result, userDefinedValue: undefined }
	] as PuzzlePartSet
}

type DifficultyScoreCase = {
	name: string
	operator: Operator
	parts: PuzzlePartSet
	expectedScore: number
}

const difficultyScoreCases: DifficultyScoreCase[] = [
	{
		name: '3 + 5 = 8 (small, no carry)',
		operator: Operator.Addition,
		parts: makeParts(3, 5, 8),
		expectedScore: 18
	},
	{
		name: '45 + 38 = 83 (carry)',
		operator: Operator.Addition,
		parts: makeParts(45, 38, 83),
		expectedScore: 90
	},
	{
		name: '200 + 300 = 500 (trailing zeros, no carry)',
		operator: Operator.Addition,
		parts: makeParts(200, 300, 500),
		expectedScore: 13
	},
	{
		name: '99 + 1 = 100 (single carry)',
		operator: Operator.Addition,
		parts: makeParts(99, 1, 100),
		expectedScore: 100
	},
	{
		name: '567 + 489 = 1056 (multiple carries)',
		operator: Operator.Addition,
		parts: makeParts(567, 489, 1056),
		expectedScore: 100
	},
	{
		name: '8 - 3 = 5 (small, no borrow)',
		operator: Operator.Subtraction,
		parts: makeParts(8, 3, 5),
		expectedScore: 21
	},
	{
		name: '52 - 38 = 14 (borrow)',
		operator: Operator.Subtraction,
		parts: makeParts(52, 38, 14),
		expectedScore: 85
	},
	{
		name: '100 - 1 = 99 (multiple borrows)',
		operator: Operator.Subtraction,
		parts: makeParts(100, 1, 99),
		expectedScore: 98
	},
	{
		name: '500 - 200 = 300 (trailing zeros)',
		operator: Operator.Subtraction,
		parts: makeParts(500, 200, 300),
		expectedScore: 15
	},
	{
		name: '1 × 5 = 5 (identity table)',
		operator: Operator.Multiplication,
		parts: makeParts(1, 5, 5),
		expectedScore: 13
	},
	{
		name: '7 × 8 = 56 (hard table)',
		operator: Operator.Multiplication,
		parts: makeParts(7, 8, 56),
		expectedScore: 80
	},
	{
		name: '3 × 4 = 12 (easy table)',
		operator: Operator.Multiplication,
		parts: makeParts(3, 4, 12),
		expectedScore: 38
	},
	{
		name: '9 × 9 = 81 (hardest common table)',
		operator: Operator.Multiplication,
		parts: makeParts(9, 9, 81),
		expectedScore: 67
	},
	{
		name: '12 × 1 = 12 (identity factor)',
		operator: Operator.Multiplication,
		parts: makeParts(12, 1, 12),
		expectedScore: 34
	},
	{
		name: '10 ÷ 1 = 10 (identity divisor)',
		operator: Operator.Division,
		parts: makeParts(10, 1, 10),
		expectedScore: 10
	},
	{
		name: '56 ÷ 7 = 8 (hard table)',
		operator: Operator.Division,
		parts: makeParts(56, 7, 8),
		expectedScore: 80
	},
	{
		name: '12 ÷ 3 = 4 (easy table)',
		operator: Operator.Division,
		parts: makeParts(12, 3, 4),
		expectedScore: 38
	},
	{
		name: '72 ÷ 8 = 9 (hard division)',
		operator: Operator.Division,
		parts: makeParts(72, 8, 9),
		expectedScore: 82
	}
]

describe('adaptiveProfile golden regressions: difficulty scoring', () => {
	it.each(difficultyScoreCases)(
		'$name',
		({ operator, parts, expectedScore }) => {
			expect(getPuzzleDifficulty(operator, parts)).toBe(expectedScore)
		}
	)
})
