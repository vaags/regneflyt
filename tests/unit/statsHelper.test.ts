import { describe, expect, it } from 'vitest'
import { getQuizStats } from '../../src/helpers/statsHelper'
import { Operator } from '../../src/models/constants/Operator'
import type { Puzzle, PuzzlePartSet } from '../../src/models/Puzzle'

const emptyPartSet: PuzzlePartSet = [
	{ userDefinedValue: undefined, generatedValue: 0 },
	{ userDefinedValue: undefined, generatedValue: 0 },
	{ userDefinedValue: undefined, generatedValue: 0 }
]

describe('statsHelper', () => {
	it('calculates correct answer count and percentage for mixed answers', () => {
		const result = getQuizStats([
			{
				parts: emptyPartSet,
				duration: 2,
				isCorrect: true,
				operator: Operator.Addition,
				unknownPartIndex: 2 as const
			},
			{
				parts: emptyPartSet,
				duration: 4,
				isCorrect: false,
				operator: Operator.Addition,
				unknownPartIndex: 2 as const
			}
		])

		expect(result.correctAnswerCount).toBe(1)
		expect(result.correctAnswerPercentage).toBe(50)
	})

	it('returns zeroed stats for empty puzzle set', () => {
		const result = getQuizStats([])

		expect(result.starCount).toBe(0)
		expect(result.correctAnswerCount).toBe(0)
		expect(result.correctAnswerPercentage).toBe(0)
	})

	it('counts stars for correct answers within threshold', () => {
		const result = getQuizStats([
			{
				parts: emptyPartSet,
				duration: 2,
				isCorrect: true,
				operator: Operator.Addition,
				unknownPartIndex: 2 as const
			},
			{
				parts: emptyPartSet,
				duration: 3,
				isCorrect: true,
				operator: Operator.Addition,
				unknownPartIndex: 2 as const
			},
			{
				parts: emptyPartSet,
				duration: 4,
				isCorrect: true,
				operator: Operator.Addition,
				unknownPartIndex: 2 as const
			}
		])

		// duration 2 and 3 are within threshold (3s), duration 4 is not
		expect(result.starCount).toBe(2)
		expect(result.correctAnswerCount).toBe(3)
		expect(result.correctAnswerPercentage).toBe(100)
	})

	it('does not count stars for incorrect fast answers', () => {
		const result = getQuizStats([
			{
				parts: emptyPartSet,
				duration: 1,
				isCorrect: false,
				operator: Operator.Addition,
				unknownPartIndex: 2 as const
			}
		])

		expect(result.starCount).toBe(0)
		expect(result.correctAnswerCount).toBe(0)
		expect(result.correctAnswerPercentage).toBe(0)
	})

	it('rounds percentage correctly', () => {
		const result = getQuizStats([
			{
				parts: emptyPartSet,
				duration: 2,
				isCorrect: true,
				operator: Operator.Addition,
				unknownPartIndex: 2 as const
			},
			{
				parts: emptyPartSet,
				duration: 4,
				isCorrect: false,
				operator: Operator.Addition,
				unknownPartIndex: 2 as const
			},
			{
				parts: emptyPartSet,
				duration: 5,
				isCorrect: false,
				operator: Operator.Addition,
				unknownPartIndex: 2 as const
			}
		])

		expect(result.correctAnswerCount).toBe(1)
		expect(result.correctAnswerPercentage).toBe(33)
	})
})
