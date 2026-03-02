import { describe, expect, it } from 'vitest'
import { getQuizScoreSum } from '../../src/helpers/scoreHelper'
import { getQuiz } from '../../src/helpers/quizHelper'
import { Operator, OperatorExtended } from '../../src/models/constants/Operator'
import { PuzzleMode } from '../../src/models/constants/PuzzleMode'
import type { PuzzlePartSet } from '../../src/models/Puzzle'

const emptyPartSet: PuzzlePartSet = [
	{ userDefinedValue: undefined, generatedValue: 0 },
	{ userDefinedValue: undefined, generatedValue: 0 },
	{ userDefinedValue: undefined, generatedValue: 0 }
]

describe('scoreHelper', () => {
	it('calculates score and percentages for mixed answers', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = Operator.Addition
		quiz.puzzleMode = PuzzleMode.Normal
		quiz.puzzleTimeLimit = false

		const puzzleSet = [
			{
				parts: emptyPartSet,
				timeout: false,
				duration: 2,
				isCorrect: true,
				operator: Operator.Addition,
				unknownPuzzlePart: 2 as const
			},
			{
				parts: emptyPartSet,
				timeout: false,
				duration: 4,
				isCorrect: false,
				operator: Operator.Addition,
				unknownPuzzlePart: 2 as const
			}
		]

		const score = getQuizScoreSum(quiz, puzzleSet)

		expect(score.correctAnswerCount).toBe(1)
		expect(score.correctAnswerPercentage).toBe(50)
		expect(score.totalScore).toBe(24)
	})

	it('returns zeroed scores for empty puzzle set', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))

		const score = getQuizScoreSum(quiz, [])

		expect(score.totalScore).toBe(0)
		expect(score.correctAnswerCount).toBe(0)
		expect(score.correctAnswerPercentage).toBe(0)
	})

	it('applies time-limit multiplier for fast correct and incorrect answers', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = Operator.Addition
		quiz.puzzleMode = PuzzleMode.Normal
		quiz.puzzleTimeLimit = true

		const puzzleSet = [
			{
				parts: emptyPartSet,
				timeout: false,
				duration: 2,
				isCorrect: true,
				operator: Operator.Addition,
				unknownPuzzlePart: 2 as const
			},
			{
				parts: emptyPartSet,
				timeout: false,
				duration: 5,
				isCorrect: false,
				operator: Operator.Addition,
				unknownPuzzlePart: 2 as const
			}
		]

		const score = getQuizScoreSum(quiz, puzzleSet)

		expect(score.correctAnswerCount).toBe(1)
		expect(score.correctAnswerPercentage).toBe(50)
		expect(score.totalScore).toBe(48)
	})

	it('applies per-puzzle mode multiplier when puzzle includes puzzleMode', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = Operator.Addition
		quiz.puzzleMode = PuzzleMode.Normal
		quiz.puzzleTimeLimit = false

		const score = getQuizScoreSum(quiz, [
			{
				parts: emptyPartSet,
				timeout: false,
				duration: 2,
				isCorrect: true,
				operator: Operator.Addition,
				puzzleMode: PuzzleMode.Random,
				unknownPuzzlePart: 2 as const
			}
		])

		expect(score.totalScore).toBe(106)
	})

	it('applies alternate mode multiplier when puzzle includes puzzleMode', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = Operator.Addition
		quiz.puzzleMode = PuzzleMode.Normal
		quiz.puzzleTimeLimit = false

		const score = getQuizScoreSum(quiz, [
			{
				parts: emptyPartSet,
				timeout: false,
				duration: 2,
				isCorrect: true,
				operator: Operator.Addition,
				puzzleMode: PuzzleMode.Alternate,
				unknownPuzzlePart: 2 as const
			}
		])

		expect(score.totalScore).toBe(80)
	})

	it('throws when multiplication/division tables are empty', () => {
		const quiz = getQuiz(new URLSearchParams('operator=2&difficulty=1'))
		quiz.selectedOperator = Operator.Multiplication
		quiz.operatorSettings[Operator.Multiplication].possibleValues = []

		expect(() =>
			getQuizScoreSum(quiz, [
				{
					parts: emptyPartSet,
					timeout: false,
					duration: 2,
					isCorrect: true,
					operator: Operator.Multiplication,
					unknownPuzzlePart: 2 as const
				}
			])
		).toThrow(
			'Cannot calculate multiplication/division table score: tables array must contain at least one value.'
		)
	})

	it('throws when multiplication/division table value is out of range', () => {
		const quiz = getQuiz(new URLSearchParams('operator=2&difficulty=1'))
		quiz.selectedOperator = Operator.Multiplication
		quiz.operatorSettings[Operator.Multiplication].possibleValues = [15]

		expect(() =>
			getQuizScoreSum(quiz, [
				{
					parts: emptyPartSet,
					timeout: false,
					duration: 2,
					isCorrect: true,
					operator: Operator.Multiplication,
					unknownPuzzlePart: 2 as const
				}
			])
		).toThrow(
			'Cannot calculate multiplication/division table score: invalid table value 15. Expected 1-14.'
		)
	})

	it('uses mixed per-puzzle puzzle modes in a single quiz score', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = Operator.Addition
		quiz.puzzleMode = PuzzleMode.Normal
		quiz.puzzleTimeLimit = false

		const score = getQuizScoreSum(quiz, [
			{
				parts: emptyPartSet,
				timeout: false,
				duration: 2,
				isCorrect: true,
				operator: Operator.Addition,
				puzzleMode: PuzzleMode.Normal,
				unknownPuzzlePart: 2 as const
			},
			{
				parts: emptyPartSet,
				timeout: false,
				duration: 4,
				isCorrect: true,
				operator: Operator.Addition,
				puzzleMode: PuzzleMode.Alternate,
				unknownPuzzlePart: 2 as const
			},
			{
				parts: emptyPartSet,
				timeout: false,
				duration: 5,
				isCorrect: false,
				operator: Operator.Addition,
				puzzleMode: PuzzleMode.Random,
				unknownPuzzlePart: 2 as const
			}
		])

		expect(score.totalScore).toBe(68)
	})

	it('uses puzzle-level operator settings for scoring when available', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = Operator.Addition
		quiz.puzzleMode = PuzzleMode.Normal
		quiz.puzzleTimeLimit = false

		const score = getQuizScoreSum(quiz, [
			{
				parts: emptyPartSet,
				timeout: false,
				duration: 2,
				isCorrect: true,
				operator: Operator.Addition,
				unknownPuzzlePart: 2 as const,
				operatorSettings: {
					operator: Operator.Addition,
					range: [1, 200] as [number, number],
					possibleValues: [],
					score: 0
				}
			}
		])

		// range [1, 200] → base score = max(10, round(199 * 1.5)) = 299
		// speedMultiplier at dur=2 ≈ 1.833, total = round(299 * 1.833) = 548
		expect(score.totalScore).toBe(548)
	})

	it('applies 1.5x all-operators multiplier when selectedOperator is All', () => {
		const quiz = getQuiz(new URLSearchParams('operator=4&difficulty=1'))
		quiz.selectedOperator = OperatorExtended.All
		quiz.puzzleMode = PuzzleMode.Normal
		quiz.puzzleTimeLimit = false

		const score = getQuizScoreSum(quiz, [
			{
				parts: emptyPartSet,
				timeout: false,
				duration: 6,
				isCorrect: true,
				operator: Operator.Addition,
				unknownPuzzlePart: 2 as const
			}
		])

		// base=15 (range [1,20] → 19*1.5=28.5→29), allOp=29*1.5=43.5
		// speed at 6s = 1 + 6/12 = 1.5, score = 43.5*1.5 = 65.25 → round(65)
		expect(score.totalScore).toBe(65)
	})

	it('gives maximum speed bonus at 0 seconds and no bonus at 12 seconds', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = Operator.Addition
		quiz.puzzleMode = PuzzleMode.Normal
		quiz.puzzleTimeLimit = false

		const instantScore = getQuizScoreSum(quiz, [
			{
				parts: emptyPartSet,
				timeout: false,
				duration: 0,
				isCorrect: true,
				operator: Operator.Addition,
				unknownPuzzlePart: 2 as const
			}
		])

		const slowScore = getQuizScoreSum(quiz, [
			{
				parts: emptyPartSet,
				timeout: false,
				duration: 12,
				isCorrect: true,
				operator: Operator.Addition,
				unknownPuzzlePart: 2 as const
			}
		])

		// base = 29 (range [1,20]). At 0s: multiplier=2, score=58. At 12s: multiplier=1, score=29.
		expect(instantScore.totalScore).toBe(58)
		expect(slowScore.totalScore).toBe(29)
		expect(instantScore.totalScore).toBe(slowScore.totalScore * 2)
	})
})
