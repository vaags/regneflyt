import { describe, expect, it } from 'vitest'
import {
	getQuiz,
	getQuizDifficultySettings,
	getQuizTitle
} from '../../src/helpers/quizHelper'
import {
	adaptiveDifficultyId,
	customAdaptiveDifficultyId
} from '../../src/models/AdaptiveProfile'
import { Operator } from '../../src/models/constants/Operator'
import { PuzzleMode } from '../../src/models/constants/PuzzleMode'

describe('quizHelper', () => {
	it('normalizes legacy preset levels to adaptive mode', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=6'))

		expect(quiz.difficulty).toBe(adaptiveDifficultyId)
		expect(quiz.allowNegativeAnswers).toBe(true)
	})

	it('keeps custom adaptive mode when difficulty is 0', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))

		const updated = getQuizDifficultySettings(quiz, customAdaptiveDifficultyId)

		expect(updated.difficulty).toBe(customAdaptiveDifficultyId)
		expect(updated.allowNegativeAnswers).toBe(true)
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
		expect(quiz.puzzleMode).toBe(PuzzleMode.Normal)
		expect(quiz.allowNegativeAnswers).toBe(true)
		expect(quiz.adaptiveSkillByOperator).toEqual([0, 0, 0, 0])
		expect(
			quiz.operatorSettings[Operator.Multiplication].possibleValues
		).toEqual([3, 5])
		expect(quiz.operatorSettings[Operator.Division].possibleValues).toEqual([
			2, 4
		])
	})

	it('builds fallback title when custom title is missing', () => {
		const quiz = getQuiz(new URLSearchParams('operator=2&difficulty=0'))

		expect(getQuizTitle(quiz)).toBe('Multiplikasjon: Egendefinert adaptiv')

		quiz.difficulty = adaptiveDifficultyId
		expect(getQuizTitle(quiz)).toBe('Multiplikasjon: Adaptiv')
	})

	it('defaults to adaptive mode when difficulty param is missing', () => {
		const quiz = getQuiz(new URLSearchParams('operator=1'))

		expect(quiz.difficulty).toBe(adaptiveDifficultyId)
		expect(quiz.selectedOperator).toBe(Operator.Subtraction)
	})

	it('forces normal puzzle mode when parsing adaptive difficulty from url', () => {
		const quiz = getQuiz(new URLSearchParams('difficulty=1&puzzleMode=2'))

		expect(quiz.difficulty).toBe(adaptiveDifficultyId)
		expect(quiz.puzzleMode).toBe(PuzzleMode.Normal)
	})

	it('switches to adaptive mode and resets puzzle mode to normal', () => {
		const quiz = getQuiz(new URLSearchParams('difficulty=0&puzzleMode=2'))
		quiz.puzzleMode = PuzzleMode.Random
		quiz.allowNegativeAnswers = false

		const updated = getQuizDifficultySettings(quiz, adaptiveDifficultyId)

		expect(updated.puzzleMode).toBe(PuzzleMode.Normal)
		expect(updated.allowNegativeAnswers).toBe(true)
	})

	it('keeps custom mode settings when switching to difficulty 0', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.allowNegativeAnswers = false
		quiz.puzzleMode = PuzzleMode.Random

		const updated = getQuizDifficultySettings(quiz, customAdaptiveDifficultyId)

		expect(updated.allowNegativeAnswers).toBe(false)
		expect(updated.puzzleMode).toBe(PuzzleMode.Random)
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
		expect(quiz.duration).toBe(0.5)
		expect(quiz.puzzleTimeLimit).toBe(false)
		expect(quiz.allowNegativeAnswers).toBe(true)
		expect(quiz.difficulty).toBe(adaptiveDifficultyId)
		expect(
			quiz.operatorSettings[Operator.Multiplication].possibleValues
		).toEqual([7])
		expect(quiz.operatorSettings[Operator.Division].possibleValues).toEqual([5])
	})

	it('respects allowNegativeAnswers when parsed from custom mode', () => {
		const quiz = getQuiz(
			new URLSearchParams('difficulty=0&allowNegativeAnswers=false')
		)

		expect(quiz.allowNegativeAnswers).toBe(false)
	})

	it('applies adaptive allowNegativeAnswers=true across both entry paths', () => {
		const parsedAdaptive = getQuiz(
			new URLSearchParams('difficulty=1&allowNegativeAnswers=true')
		)
		expect(parsedAdaptive.allowNegativeAnswers).toBe(true)

		const parsedCustom = getQuiz(
			new URLSearchParams('difficulty=0&allowNegativeAnswers=false')
		)
		const switchedToAdaptive = getQuizDifficultySettings(
			parsedCustom,
			adaptiveDifficultyId
		)

		expect(switchedToAdaptive.allowNegativeAnswers).toBe(true)
	})

	it('clamps malformed duration values to configured bounds', () => {
		const tooLowDurationQuiz = getQuiz(new URLSearchParams('duration=-10'))
		const tooHighDurationQuiz = getQuiz(new URLSearchParams('duration=999'))
		const invalidDurationQuiz = getQuiz(new URLSearchParams('duration=abc'))

		expect(tooLowDurationQuiz.duration).toBe(0.5)
		expect(tooHighDurationQuiz.duration).toBe(480)
		expect(invalidDurationQuiz.duration).toBe(0.5)
	})

	it('normalizes malformed add/sub ranges and enforces min/max ordering', () => {
		const quiz = getQuiz(
			new URLSearchParams('addMin=90&addMax=10&subMin=-100&subMax=999')
		)

		expect(quiz.operatorSettings[Operator.Addition].range).toEqual([10, 90])
		expect(quiz.operatorSettings[Operator.Subtraction].range).toEqual([-40, 50])
	})

	it('filters invalid multiplication/division table values from URL params', () => {
		const quiz = getQuiz(
			new URLSearchParams('mulValues=0,3,13,foo&divValues=100,bar')
		)

		expect(
			quiz.operatorSettings[Operator.Multiplication].possibleValues
		).toEqual([3])
		expect(quiz.operatorSettings[Operator.Division].possibleValues).toEqual([5])
	})
})
