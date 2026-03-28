import { describe, expect, it } from 'vitest'
import {
	getQuiz,
	getQuizDifficultySettings,
	getQuizTitle
} from '$lib/helpers/quizHelper'
import {
	adaptiveDifficultyId,
	customAdaptiveDifficultyId
} from '$lib/models/AdaptiveProfile'
import * as m from '$lib/paraglide/messages.js'
import { getOperatorLabel } from '$lib/constants/Operator'
import { Operator } from '$lib/constants/Operator'
import { PuzzleMode } from '$lib/constants/PuzzleMode'

describe('quizHelper', () => {
	it('normalizes legacy preset levels to adaptive mode', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=6'))

		expect(quiz.difficulty).toBe(adaptiveDifficultyId)
		expect(quiz.allowNegativeAnswers).toBe(false)
	})

	it('preserves custom mode settings when switching to custom difficulty', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=0'))
		quiz.allowNegativeAnswers = false
		quiz.puzzleMode = PuzzleMode.Random

		const updated = getQuizDifficultySettings(quiz, customAdaptiveDifficultyId)

		expect(updated.difficulty).toBe(customAdaptiveDifficultyId)
		expect(updated.allowNegativeAnswers).toBe(false)
		expect(updated.puzzleMode).toBe(PuzzleMode.Random)
	})

	it('parses url params and honors defaults/compat values', () => {
		const quiz = getQuiz(
			new URLSearchParams(
				'duration=2.5&timeLimit=3&difficulty=1&allowNegativeAnswers=true&mulValues=3,5&divValues=2,4&puzzleMode=2&operator=3'
			)
		)

		expect(quiz.duration).toBe(2.5)
		expect(quiz.showPuzzleProgressBar).toBe(false)
		expect(quiz.selectedOperator).toBe(Operator.Division)
		expect(quiz.puzzleMode).toBe(PuzzleMode.Normal)
		expect(quiz.allowNegativeAnswers).toBe(false)
		expect(quiz.adaptiveSkillByOperator).toEqual([0, 0, 0, 0])
		expect(
			quiz.operatorSettings[Operator.Multiplication].possibleValues
		).toEqual([3, 5])
		expect(quiz.operatorSettings[Operator.Division].possibleValues).toEqual([
			2, 4
		])
	})

	it('builds derived title from operator and difficulty', () => {
		const quiz = getQuiz(new URLSearchParams('operator=2&difficulty=0'))
		const label = getOperatorLabel(Operator.Multiplication)

		expect(getQuizTitle(quiz)).toBe(`${label}: ${m.difficulty_custom()}`)

		quiz.difficulty = adaptiveDifficultyId
		expect(getQuizTitle(quiz)).toBe(`${label}: ${m.difficulty_adaptive()}`)
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
		expect(updated.allowNegativeAnswers).toBe(false)
	})

	it('keeps custom mode settings when switching to difficulty 0', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.allowNegativeAnswers = false
		quiz.puzzleMode = PuzzleMode.Random

		const updated = getQuizDifficultySettings(quiz, customAdaptiveDifficultyId)

		expect(updated.allowNegativeAnswers).toBe(false)
		expect(updated.puzzleMode).toBe(PuzzleMode.Random)
	})

	it('ignores custom title when provided', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=2'))
		const label = getOperatorLabel(Operator.Addition)

		expect(getQuizTitle(quiz)).toBe(`${label}: ${m.difficulty_adaptive()}`)
	})

	it('applies defaults when params are missing or null-like', () => {
		const quiz = getQuiz(new URLSearchParams('mulValues=null&divValues=null'))

		expect(quiz.duration).toBe(0.1)
		expect(quiz.showPuzzleProgressBar).toBe(false)
		expect(quiz.allowNegativeAnswers).toBe(false)
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

	it('applies adaptive allowNegativeAnswers=false across both entry paths', () => {
		const parsedAdaptive = getQuiz(
			new URLSearchParams('difficulty=1&allowNegativeAnswers=true')
		)
		expect(parsedAdaptive.allowNegativeAnswers).toBe(false)

		const parsedCustom = getQuiz(
			new URLSearchParams('difficulty=0&allowNegativeAnswers=false')
		)
		const switchedToAdaptive = getQuizDifficultySettings(
			parsedCustom,
			adaptiveDifficultyId
		)

		expect(switchedToAdaptive.allowNegativeAnswers).toBe(false)
	})

	it('clamps malformed duration values to configured bounds', () => {
		const tooLowDurationQuiz = getQuiz(new URLSearchParams('duration=-10'))
		const tooHighDurationQuiz = getQuiz(new URLSearchParams('duration=999'))
		const invalidDurationQuiz = getQuiz(new URLSearchParams('duration=abc'))

		expect(tooLowDurationQuiz.duration).toBe(0.1)
		expect(tooHighDurationQuiz.duration).toBe(480)
		expect(invalidDurationQuiz.duration).toBe(0.1)
	})

	it('normalizes malformed add/sub ranges and enforces min/max ordering', () => {
		const quiz = getQuiz(
			new URLSearchParams('addMin=90&addMax=10&subMin=-100&subMax=999')
		)

		expect(quiz.operatorSettings[Operator.Addition].range).toEqual([10, 90])
		expect(quiz.operatorSettings[Operator.Subtraction].range).toEqual([
			-50, 100
		])
	})

	it('filters invalid multiplication/division table values from URL params', () => {
		const quiz = getQuiz(
			new URLSearchParams('mulValues=0,3,16,foo&divValues=100,bar')
		)

		expect(
			quiz.operatorSettings[Operator.Multiplication].possibleValues
		).toEqual([3])
		expect(quiz.operatorSettings[Operator.Division].possibleValues).toEqual([5])
	})

	it('clamps invalid duration values in getQuizDifficultySettings', () => {
		const quiz = getQuiz(new URLSearchParams('difficulty=0'))

		quiz.duration = -5
		expect(getQuizDifficultySettings(quiz, adaptiveDifficultyId).duration).toBe(
			0.1
		)

		quiz.duration = 999
		expect(getQuizDifficultySettings(quiz, adaptiveDifficultyId).duration).toBe(
			480
		)
	})

	it('preserves unlimited duration (0) in getQuizDifficultySettings', () => {
		const quiz = getQuiz(new URLSearchParams('difficulty=0&duration=0'))

		expect(quiz.duration).toBe(0)

		const updated = getQuizDifficultySettings(quiz, adaptiveDifficultyId)
		expect(updated.duration).toBe(0)
	})

	it('preserves non-zero duration in getQuizDifficultySettings', () => {
		const quiz = getQuiz(new URLSearchParams('difficulty=0&duration=3'))

		const updated = getQuizDifficultySettings(quiz, adaptiveDifficultyId)

		expect(updated.duration).toBe(3)
	})

	it('ignores invalid puzzleMode param and defaults to Normal', () => {
		const quiz = getQuiz(new URLSearchParams('difficulty=0&puzzleMode=99'))

		expect(quiz.puzzleMode).toBe(PuzzleMode.Normal)
	})

	it('ignores invalid operator param and defaults to undefined', () => {
		const quiz = getQuiz(new URLSearchParams('difficulty=0&operator=99'))

		expect(quiz.selectedOperator).toBeUndefined()
	})

	it('parses duration=0 as unlimited mode from URL params', () => {
		const quiz = getQuiz(new URLSearchParams('duration=0'))

		expect(quiz.duration).toBe(0)
	})

	it('clamps negative duration but allows zero (unlimited)', () => {
		const negativeQuiz = getQuiz(new URLSearchParams('duration=-1'))
		const zeroQuiz = getQuiz(new URLSearchParams('duration=0'))

		expect(negativeQuiz.duration).toBe(0.1)
		expect(zeroQuiz.duration).toBe(0)
	})
})
