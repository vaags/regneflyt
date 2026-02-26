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
		expect(score.totalScore).toBe(38)
	})
})