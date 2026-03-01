import { describe, expect, it } from 'vitest'
import { getQuizScoreSum } from '../../src/helpers/scoreHelper'
import { getQuiz } from '../../src/helpers/quizHelper'
import { Operator } from '../../src/models/constants/Operator'
import { PuzzleMode } from '../../src/models/constants/PuzzleMode'

describe('scoreHelper', () => {
	it('calculates score and percentages for mixed answers', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = Operator.Addition
		quiz.puzzleMode = PuzzleMode.Normal
		quiz.puzzleTimeLimit = false

		const puzzleSet = [
			{
				parts: [],
				timeout: false,
				duration: 2,
				isCorrect: true,
				operator: Operator.Addition,
				operatorLabel: '+',
				unknownPuzzlePart: 2
			},
			{
				parts: [],
				timeout: false,
				duration: 4,
				isCorrect: false,
				operator: Operator.Addition,
				operatorLabel: '+',
				unknownPuzzlePart: 2
			}
		]

		const score = getQuizScoreSum(quiz, puzzleSet)

		expect(score.correctAnswerCount).toBe(1)
		expect(score.correctAnswerPercentage).toBe(50)
		expect(score.totalScore).toBe(29)
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
				parts: [],
				timeout: false,
				duration: 2,
				isCorrect: true,
				operator: Operator.Addition,
				operatorLabel: '+',
				unknownPuzzlePart: 2
			},
			{
				parts: [],
				timeout: false,
				duration: 5,
				isCorrect: false,
				operator: Operator.Addition,
				operatorLabel: '+',
				unknownPuzzlePart: 2
			}
		]

		const score = getQuizScoreSum(quiz, puzzleSet)

		expect(score.correctAnswerCount).toBe(1)
		expect(score.correctAnswerPercentage).toBe(50)
		expect(score.totalScore).toBe(58)
	})

	it('throws for unsupported puzzle mode', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.puzzleMode = 99 as PuzzleMode

		expect(() =>
			getQuizScoreSum(quiz, [
				{
					parts: [],
					timeout: false,
					duration: 2,
					isCorrect: true,
					operator: Operator.Addition,
					operatorLabel: '+',
					unknownPuzzlePart: 2
				}
			])
		).toThrow('Cannot get puzzleMode multiplier: PuzzleMode not recognized')
	})

	it('throws for unsupported operator in score settings', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.operatorSettings[0].operator = 99 as Operator

		expect(() =>
			getQuizScoreSum(quiz, [
				{
					parts: [],
					timeout: false,
					duration: 2,
					isCorrect: true,
					operator: Operator.Addition,
					operatorLabel: '+',
					unknownPuzzlePart: 2
				}
			])
		).toThrow('Cannot get score: Operator not recognized')
	})

	it('applies per-puzzle mode multiplier when puzzle includes puzzleMode', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = Operator.Addition
		quiz.puzzleMode = PuzzleMode.Normal
		quiz.puzzleTimeLimit = false

		const score = getQuizScoreSum(quiz, [
			{
				parts: [],
				timeout: false,
				duration: 2,
				isCorrect: true,
				operator: Operator.Addition,
				operatorLabel: '+',
				puzzleMode: PuzzleMode.Random,
				unknownPuzzlePart: 2
			}
		])

		expect(score.totalScore).toBe(116)
	})

	it('applies alternate mode multiplier when puzzle includes puzzleMode', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = Operator.Addition
		quiz.puzzleMode = PuzzleMode.Normal
		quiz.puzzleTimeLimit = false

		const score = getQuizScoreSum(quiz, [
			{
				parts: [],
				timeout: false,
				duration: 2,
				isCorrect: true,
				operator: Operator.Addition,
				operatorLabel: '+',
				puzzleMode: PuzzleMode.Alternate,
				unknownPuzzlePart: 2
			}
		])

		expect(score.totalScore).toBe(87)
	})

	it('throws when multiplication/division tables are empty', () => {
		const quiz = getQuiz(new URLSearchParams('operator=2&difficulty=1'))
		quiz.selectedOperator = Operator.Multiplication
		quiz.operatorSettings[Operator.Multiplication].possibleValues = []

		expect(() =>
			getQuizScoreSum(quiz, [
				{
					parts: [],
					timeout: false,
					duration: 2,
					isCorrect: true,
					operator: Operator.Multiplication,
					operatorLabel: '×',
					unknownPuzzlePart: 2
				}
			])
		).toThrow(
			'Cannot calculate multiplication/division table score: tables array must contain at least one value.'
		)
	})

	it('uses mixed per-puzzle puzzle modes in a single quiz score', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = Operator.Addition
		quiz.puzzleMode = PuzzleMode.Normal
		quiz.puzzleTimeLimit = false

		const score = getQuizScoreSum(quiz, [
			{
				parts: [],
				timeout: false,
				duration: 2,
				isCorrect: true,
				operator: Operator.Addition,
				operatorLabel: '+',
				puzzleMode: PuzzleMode.Normal,
				unknownPuzzlePart: 2
			},
			{
				parts: [],
				timeout: false,
				duration: 4,
				isCorrect: true,
				operator: Operator.Addition,
				operatorLabel: '+',
				puzzleMode: PuzzleMode.Alternate,
				unknownPuzzlePart: 2
			},
			{
				parts: [],
				timeout: false,
				duration: 5,
				isCorrect: false,
				operator: Operator.Addition,
				operatorLabel: '+',
				puzzleMode: PuzzleMode.Random,
				unknownPuzzlePart: 2
			}
		])

		expect(score.totalScore).toBe(43.5)
	})
})
