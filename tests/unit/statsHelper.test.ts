import { describe, expect, it } from 'vitest'
import {
	getQuizStats,
	getOperatorStats,
	updatePersonalBests
} from '../../src/helpers/statsHelper'
import { Operator } from '../../src/models/constants/Operator'
import type { Puzzle, PuzzlePartSet } from '../../src/models/Puzzle'
import type { PersonalBests } from '../../src/stores'

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
				unknownPuzzlePart: 2 as const
			},
			{
				parts: emptyPartSet,
				duration: 4,
				isCorrect: false,
				operator: Operator.Addition,
				unknownPuzzlePart: 2 as const
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
				unknownPuzzlePart: 2 as const
			},
			{
				parts: emptyPartSet,
				duration: 3,
				isCorrect: true,
				operator: Operator.Addition,
				unknownPuzzlePart: 2 as const
			},
			{
				parts: emptyPartSet,
				duration: 4,
				isCorrect: true,
				operator: Operator.Addition,
				unknownPuzzlePart: 2 as const
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
				unknownPuzzlePart: 2 as const
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
				unknownPuzzlePart: 2 as const
			},
			{
				parts: emptyPartSet,
				duration: 4,
				isCorrect: false,
				operator: Operator.Addition,
				unknownPuzzlePart: 2 as const
			},
			{
				parts: emptyPartSet,
				duration: 5,
				isCorrect: false,
				operator: Operator.Addition,
				unknownPuzzlePart: 2 as const
			}
		])

		expect(result.correctAnswerCount).toBe(1)
		expect(result.correctAnswerPercentage).toBe(33)
	})
})

function makePuzzle(
	operator: Operator,
	isCorrect: boolean,
	duration: number
): Puzzle {
	return {
		parts: emptyPartSet,
		duration,
		isCorrect,
		operator,
		unknownPuzzlePart: 2 as const
	}
}

function emptyBests(): PersonalBests {
	return [
		{ bestAccuracy: 0, fastestAvgTime: null },
		{ bestAccuracy: 0, fastestAvgTime: null },
		{ bestAccuracy: 0, fastestAvgTime: null },
		{ bestAccuracy: 0, fastestAvgTime: null }
	]
}

describe('getOperatorStats', () => {
	it('returns accuracy and avg time for a given operator', () => {
		const puzzles = [
			makePuzzle(Operator.Addition, true, 2),
			makePuzzle(Operator.Addition, false, 4),
			makePuzzle(Operator.Subtraction, true, 1)
		]
		const stats = getOperatorStats(puzzles, Operator.Addition)
		expect(stats.accuracy).toBe(50)
		expect(stats.avgTime).toBe(3)
	})

	it('returns null avgTime when no puzzles for operator', () => {
		const puzzles = [makePuzzle(Operator.Addition, true, 2)]
		const stats = getOperatorStats(puzzles, Operator.Subtraction)
		expect(stats.accuracy).toBe(0)
		expect(stats.avgTime).toBeNull()
	})

	it('calculates 100% accuracy when all correct', () => {
		const puzzles = [
			makePuzzle(Operator.Multiplication, true, 1.5),
			makePuzzle(Operator.Multiplication, true, 2.5)
		]
		const stats = getOperatorStats(puzzles, Operator.Multiplication)
		expect(stats.accuracy).toBe(100)
		expect(stats.avgTime).toBe(2)
	})
})

describe('updatePersonalBests', () => {
	it('updates best accuracy when new quiz has higher accuracy', () => {
		const bests = emptyBests()
		const puzzles = [
			makePuzzle(Operator.Addition, true, 2),
			makePuzzle(Operator.Addition, false, 3)
		]
		const updated = updatePersonalBests(bests, puzzles)
		expect(updated[Operator.Addition].bestAccuracy).toBe(50)
	})

	it('does not lower best accuracy', () => {
		const bests = emptyBests()
		bests[Operator.Addition] = { bestAccuracy: 80, fastestAvgTime: null }
		const puzzles = [
			makePuzzle(Operator.Addition, true, 2),
			makePuzzle(Operator.Addition, false, 3)
		]
		const updated = updatePersonalBests(bests, puzzles)
		expect(updated[Operator.Addition].bestAccuracy).toBe(80)
	})

	it('records fastest avg time only on 100% accuracy', () => {
		const bests = emptyBests()
		const puzzles = [
			makePuzzle(Operator.Subtraction, true, 1.5),
			makePuzzle(Operator.Subtraction, true, 2.5)
		]
		const updated = updatePersonalBests(bests, puzzles)
		expect(updated[Operator.Subtraction].bestAccuracy).toBe(100)
		expect(updated[Operator.Subtraction].fastestAvgTime).toBe(2)
	})

	it('does not record fastest avg time without 100% accuracy', () => {
		const bests = emptyBests()
		const puzzles = [
			makePuzzle(Operator.Division, true, 1),
			makePuzzle(Operator.Division, false, 2)
		]
		const updated = updatePersonalBests(bests, puzzles)
		expect(updated[Operator.Division].bestAccuracy).toBe(50)
		expect(updated[Operator.Division].fastestAvgTime).toBeNull()
	})

	it('updates fastest avg time when new time is faster', () => {
		const bests = emptyBests()
		bests[Operator.Addition] = { bestAccuracy: 100, fastestAvgTime: 3 }
		const puzzles = [
			makePuzzle(Operator.Addition, true, 1),
			makePuzzle(Operator.Addition, true, 2)
		]
		const updated = updatePersonalBests(bests, puzzles)
		expect(updated[Operator.Addition].fastestAvgTime).toBe(1.5)
	})

	it('does not update fastest avg time when new time is slower', () => {
		const bests = emptyBests()
		bests[Operator.Addition] = { bestAccuracy: 100, fastestAvgTime: 1 }
		const puzzles = [
			makePuzzle(Operator.Addition, true, 3),
			makePuzzle(Operator.Addition, true, 4)
		]
		const updated = updatePersonalBests(bests, puzzles)
		expect(updated[Operator.Addition].fastestAvgTime).toBe(1)
	})

	it('skips operators with no puzzles', () => {
		const bests = emptyBests()
		bests[Operator.Multiplication] = { bestAccuracy: 75, fastestAvgTime: null }
		const puzzles = [makePuzzle(Operator.Addition, true, 2)]
		const updated = updatePersonalBests(bests, puzzles)
		expect(updated[Operator.Multiplication].bestAccuracy).toBe(75)
	})

	it('handles multiple operators in the same quiz', () => {
		const bests = emptyBests()
		const puzzles = [
			makePuzzle(Operator.Addition, true, 1),
			makePuzzle(Operator.Addition, true, 2),
			makePuzzle(Operator.Multiplication, true, 3),
			makePuzzle(Operator.Multiplication, false, 4)
		]
		const updated = updatePersonalBests(bests, puzzles)
		expect(updated[Operator.Addition].bestAccuracy).toBe(100)
		expect(updated[Operator.Addition].fastestAvgTime).toBe(1.5)
		expect(updated[Operator.Multiplication].bestAccuracy).toBe(50)
		expect(updated[Operator.Multiplication].fastestAvgTime).toBeNull()
	})
})
