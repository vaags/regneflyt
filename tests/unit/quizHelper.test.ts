import { describe, expect, it } from 'vitest'
import {
	getQuiz,
	getQuizDifficultySettings,
	getQuizTitle
} from '../../src/helpers/quizHelper'
import { Operator } from '../../src/models/constants/Operator'
import { PuzzleMode } from '../../src/models/constants/PuzzleMode'

describe('quizHelper', () => {
	it('applies expected settings for non-custom difficulty', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))

		const updated = getQuizDifficultySettings(quiz, 4, quiz.difficulty)

		expect(updated.puzzleMode).toBe(PuzzleMode.Random)
		expect(updated.operatorSettings[Operator.Addition].range).toEqual([10, 20])
		expect(updated.operatorSettings[Operator.Subtraction].range).toEqual([
			20, 30
		])
		expect(
			updated.operatorSettings[Operator.Multiplication].possibleValues
		).toEqual([7, 9, 11])
		expect(updated.allowNegativeAnswers).toBe(true)
	})

	it('keeps negative answers disabled for custom mode after level 1', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))

		const updated = getQuizDifficultySettings(quiz, 0, 1)

		expect(updated.difficulty).toBe(0)
		expect(updated.allowNegativeAnswers).toBe(false)
		expect(updated.puzzleMode).toBe(quiz.puzzleMode)
	})

	it('parses url params and honors defaults/compat values', () => {
		const quiz = getQuiz(
			new URLSearchParams(
				'title=undefined&showSettings=false&duration=2.5&timeLimit=3&difficulty=1&allowNegativeAnswers=true&mulValues=3,5&divValues=2,4&puzzleMode=2&operator=3'
			)
		)

		expect(quiz.title).toBeUndefined()
		expect(quiz.showSettings).toBe(false)
		expect(quiz.duration).toBe(2.5)
		expect(quiz.puzzleTimeLimit).toBe(true)
		expect(quiz.selectedOperator).toBe(Operator.Division)
		expect(quiz.puzzleMode).toBe(PuzzleMode.Random)
		expect(quiz.allowNegativeAnswers).toBe(false)
		expect(
			quiz.operatorSettings[Operator.Multiplication].possibleValues
		).toEqual([3, 5])
		expect(quiz.operatorSettings[Operator.Division].possibleValues).toEqual([
			2, 4
		])
	})

	it('builds fallback title when custom title is missing', () => {
		const quiz = getQuiz(new URLSearchParams('operator=2&difficulty=0'))

		expect(getQuizTitle(quiz)).toBe('Multiplikasjon: Egendefinert')

		quiz.difficulty = 4
		expect(getQuizTitle(quiz)).toBe('Multiplikasjon: Nivå 4')
	})

	it('returns early when no operator is selected', () => {
		const quiz = getQuiz(new URLSearchParams('difficulty=2'))
		quiz.selectedOperator = undefined
		quiz.puzzleMode = PuzzleMode.Alternate

		const updated = getQuizDifficultySettings(quiz, 5, 2)

		expect(updated.puzzleMode).toBe(PuzzleMode.Alternate)
		expect(updated.duration).toBe(0.5)
	})

	it('throws on invalid difficulty for operator settings mapping', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=2'))

		expect(() => getQuizDifficultySettings(quiz, 99)).toThrow(
			'Invalid difficulty provided'
		)
	})

	it('uses custom title when provided', () => {
		const quiz = getQuiz(
			new URLSearchParams('title=Rask matte&operator=0&difficulty=2')
		)

		expect(getQuizTitle(quiz)).toBe('Rask matte')
	})

	it('applies defaults when params are missing or null-like', () => {
		const quiz = getQuiz(
			new URLSearchParams('title=&mulValues=null&divValues=null')
		)

		expect(quiz.title).toBeUndefined()
		expect(quiz.showSettings).toBe(true)
		expect(quiz.duration).toBe(0)
		expect(quiz.puzzleTimeLimit).toBe(false)
		expect(quiz.allowNegativeAnswers).toBe(true)
		expect(
			quiz.operatorSettings[Operator.Multiplication].possibleValues
		).toEqual([7])
		expect(quiz.operatorSettings[Operator.Division].possibleValues).toEqual([5])
	})

	it('respects allowNegativeAnswers when difficulty is not level 1', () => {
		const quiz = getQuiz(
			new URLSearchParams('difficulty=2&allowNegativeAnswers=false')
		)

		expect(quiz.allowNegativeAnswers).toBe(false)
	})

	it('keeps existing duration and normal mode for level 3', () => {
		const quiz = getQuiz(
			new URLSearchParams('operator=0&difficulty=2&duration=3')
		)

		const updated = getQuizDifficultySettings(quiz, 3, quiz.difficulty)

		expect(updated.duration).toBe(3)
		expect(updated.puzzleMode).toBe(PuzzleMode.Normal)
		expect(updated.allowNegativeAnswers).toBe(true)
		expect(updated.operatorSettings[Operator.Addition].range).toEqual([10, 20])
		expect(updated.operatorSettings[Operator.Subtraction].range).toEqual([
			20, 30
		])
		expect(
			updated.operatorSettings[Operator.Multiplication].possibleValues
		).toEqual([6, 4, 10])
		expect(updated.operatorSettings[Operator.Division].possibleValues).toEqual([
			6, 4, 10
		])
	})

	it('maps highest difficulty to expected ranges and values', () => {
		const quiz = getQuiz(new URLSearchParams('operator=1&difficulty=1'))

		const updated = getQuizDifficultySettings(quiz, 6, quiz.difficulty)

		expect(updated.puzzleMode).toBe(PuzzleMode.Random)
		expect(updated.operatorSettings[Operator.Addition].range).toEqual([30, 50])
		expect(updated.operatorSettings[Operator.Subtraction].range).toEqual([
			20, 50
		])
		expect(
			updated.operatorSettings[Operator.Multiplication].possibleValues
		).toEqual([12, 8, 7, 9])
		expect(updated.operatorSettings[Operator.Division].possibleValues).toEqual([
			12, 8, 7, 9
		])
	})

	it('maps medium difficulty level 2 to expected ranges and tables', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))

		const updated = getQuizDifficultySettings(quiz, 2, quiz.difficulty)

		expect(updated.puzzleMode).toBe(PuzzleMode.Normal)
		expect(updated.operatorSettings[Operator.Addition].range).toEqual([1, 10])
		expect(updated.operatorSettings[Operator.Subtraction].range).toEqual([
			10, 20
		])
		expect(
			updated.operatorSettings[Operator.Multiplication].possibleValues
		).toEqual([3, 5])
		expect(updated.operatorSettings[Operator.Division].possibleValues).toEqual([
			3, 5
		])
	})

	it('maps high difficulty level 5 to expected ranges and tables', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=2'))

		const updated = getQuizDifficultySettings(quiz, 5, quiz.difficulty)

		expect(updated.puzzleMode).toBe(PuzzleMode.Random)
		expect(updated.operatorSettings[Operator.Addition].range).toEqual([20, 30])
		expect(updated.operatorSettings[Operator.Subtraction].range).toEqual([
			20, 40
		])
		expect(
			updated.operatorSettings[Operator.Multiplication].possibleValues
		).toEqual([12, 8, 6])
		expect(updated.operatorSettings[Operator.Division].possibleValues).toEqual([
			12, 8, 6
		])
	})

	it('allows negative answers for custom mode when previous level was not 1', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=3'))

		const updated = getQuizDifficultySettings(quiz, 0, 3)

		expect(updated.allowNegativeAnswers).toBe(true)
		expect(updated.puzzleMode).toBe(quiz.puzzleMode)
	})
})
