import { describe, expect, it } from 'vitest'
import { Operator } from '$lib/constants/Operator'
import { PuzzleMode } from '$lib/constants/PuzzleMode'
import { isPuzzleAnswerCorrect } from '$lib/helpers/quiz/puzzleValidationHelper'
import type { Puzzle } from '$lib/models/Puzzle'

function createPuzzle(exact: number, user: number | undefined): Puzzle {
	return {
		parts: [
			{ generatedValue: 6, userDefinedValue: undefined },
			{ generatedValue: 4, userDefinedValue: undefined },
			{ generatedValue: exact, userDefinedValue: user }
		],
		duration: 0,
		isCorrect: undefined,
		operator: Operator.Addition,
		puzzleMode: PuzzleMode.Normal,
		operatorSettings: {
			operator: Operator.Addition,
			range: [1, 20],
			possibleValues: [],
			effectiveSkill: 50
		},
		unknownPartIndex: 2
	}
}

describe('puzzleValidationHelper', () => {
	it('returns true for exact answers in exact mode', () => {
		expect(isPuzzleAnswerCorrect(createPuzzle(100, 100), false)).toBe(true)
	})

	it('returns true for exact answers in estimation mode', () => {
		expect(isPuzzleAnswerCorrect(createPuzzle(100, 100), true)).toBe(true)
	})

	it('accepts answers on +/-10% boundary in estimation mode', () => {
		expect(isPuzzleAnswerCorrect(createPuzzle(100, 90), true)).toBe(true)
		expect(isPuzzleAnswerCorrect(createPuzzle(100, 110), true)).toBe(true)
	})

	it('accepts small-answer estimates within minimum absolute tolerance', () => {
		expect(isPuzzleAnswerCorrect(createPuzzle(10, 5), true)).toBe(true)
		expect(isPuzzleAnswerCorrect(createPuzzle(10, 15), true)).toBe(true)
	})

	it('rejects small-answer estimates outside minimum absolute tolerance', () => {
		expect(isPuzzleAnswerCorrect(createPuzzle(10, 4), true)).toBe(false)
		expect(isPuzzleAnswerCorrect(createPuzzle(10, 16), true)).toBe(false)
	})

	it('rejects answers outside +/-10% in estimation mode', () => {
		expect(isPuzzleAnswerCorrect(createPuzzle(100, 89), true)).toBe(false)
		expect(isPuzzleAnswerCorrect(createPuzzle(100, 111), true)).toBe(false)
	})

	it('uses percentage tolerance for large answers when larger than absolute floor', () => {
		expect(isPuzzleAnswerCorrect(createPuzzle(100, 91), true)).toBe(true)
		expect(isPuzzleAnswerCorrect(createPuzzle(100, 109), true)).toBe(true)
		expect(isPuzzleAnswerCorrect(createPuzzle(100, 90), true)).toBe(true)
		expect(isPuzzleAnswerCorrect(createPuzzle(100, 110), true)).toBe(true)
		expect(isPuzzleAnswerCorrect(createPuzzle(100, 89), true)).toBe(false)
		expect(isPuzzleAnswerCorrect(createPuzzle(100, 111), true)).toBe(false)
	})

	it('rejects near-miss answers in exact mode', () => {
		expect(isPuzzleAnswerCorrect(createPuzzle(100, 99), false)).toBe(false)
		expect(isPuzzleAnswerCorrect(createPuzzle(100, 101), false)).toBe(false)
	})

	it('requires exact zero when exact answer is zero in estimation mode', () => {
		expect(isPuzzleAnswerCorrect(createPuzzle(0, 0), true)).toBe(true)
		expect(isPuzzleAnswerCorrect(createPuzzle(0, 1), true)).toBe(false)
		expect(isPuzzleAnswerCorrect(createPuzzle(0, -1), true)).toBe(false)
	})

	it('handles negative exact answers with absolute tolerance in estimation mode', () => {
		expect(isPuzzleAnswerCorrect(createPuzzle(-100, -90), true)).toBe(true)
		expect(isPuzzleAnswerCorrect(createPuzzle(-100, -110), true)).toBe(true)
		expect(isPuzzleAnswerCorrect(createPuzzle(-100, -111), true)).toBe(false)
	})

	it('returns false when user answer is undefined', () => {
		expect(isPuzzleAnswerCorrect(createPuzzle(100, undefined), false)).toBe(
			false
		)
		expect(isPuzzleAnswerCorrect(createPuzzle(100, undefined), true)).toBe(
			false
		)
	})
})
