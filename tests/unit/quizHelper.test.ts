import { describe, expect, it } from 'vitest'
import { getQuiz, getQuizDifficultySettings } from '../../src/helpers/quizHelper'
import { Operator } from '../../src/models/constants/Operator'
import { PuzzleMode } from '../../src/models/constants/PuzzleMode'

describe('quizHelper', () => {
	it('applies expected settings for non-custom difficulty', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))

		const updated = getQuizDifficultySettings(quiz, 4, quiz.difficulty)

		expect(updated.puzzleMode).toBe(PuzzleMode.Random)
		expect(updated.operatorSettings[Operator.Addition].range).toEqual([10, 20])
		expect(updated.operatorSettings[Operator.Subtraction].range).toEqual([
			20,
			30
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
})