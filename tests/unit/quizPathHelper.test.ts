import { describe, expect, it } from 'vitest'
import { Operator } from '$lib/constants/Operator'
import { createTestQuiz } from './component-setup'
import {
	buildCanonicalQuizPathFromSearchParams,
	buildMenuPath,
	buildQuizPath,
	buildReplayQuizPath
} from '$lib/helpers/quiz/quizPathHelper'

describe('quizPathHelper', () => {
	it('builds menu path with canonical quiz params', () => {
		const quiz = createTestQuiz({
			duration: 3,
			selectedOperator: Operator.Division
		})

		const path = buildMenuPath(quiz)
		const url = new URL(path, 'https://example.com')

		expect(url.pathname).toBe('/')
		expect(url.searchParams.get('duration')).toBe('3')
		expect(url.searchParams.get('operator')).toBe(Operator.Division.toString())
	})

	it('builds quiz path with canonical quiz params', () => {
		const quiz = createTestQuiz({
			duration: 5,
			selectedOperator: Operator.Subtraction
		})

		const path = buildQuizPath(quiz)
		const url = new URL(path, 'https://example.com')

		expect(url.pathname).toBe('/quiz')
		expect(url.searchParams.get('duration')).toBe('5')
		expect(url.searchParams.get('operator')).toBe(
			Operator.Subtraction.toString()
		)
	})

	it('builds replay quiz path when results are replayable', () => {
		const quiz = createTestQuiz({ seed: 42 })

		const path = buildReplayQuizPath({
			puzzleSet: [
				{
					parts: [
						{ generatedValue: 1, userDefinedValue: 1 },
						{ generatedValue: 2, userDefinedValue: 2 },
						{ generatedValue: 3, userDefinedValue: undefined }
					],
					duration: 1,
					isCorrect: true,
					operator: Operator.Addition,
					unknownPartIndex: 2
				}
			],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz
		})

		expect(path).toBe(
			'/quiz?duration=0&showProgressBar=true&operator=0&addMin=1&addMax=10&subMin=1&subMax=10&mulValues=2%2C3%2C4%2C5&divValues=2%2C3%2C4%2C5&puzzleMode=0&difficulty=0&allowNegativeAnswers=false&seed=42&replay=true'
		)
	})

	it('returns undefined replay path when results are missing or empty', () => {
		expect(buildReplayQuizPath(null)).toBeUndefined()
		expect(
			buildReplayQuizPath({
				puzzleSet: [],
				quizStats: {
					correctAnswerCount: 0,
					correctAnswerPercentage: 0,
					starCount: 0
				},
				quiz: createTestQuiz()
			})
		).toBeUndefined()
	})

	it('builds canonical quiz path from raw search params', () => {
		const path = buildCanonicalQuizPathFromSearchParams(
			new URLSearchParams(
				'duration=999&operator=0&difficulty=0&addMin=90&addMax=10'
			)
		)
		const url = new URL(path, 'https://example.com')

		expect(url.pathname).toBe('/quiz')
		expect(url.searchParams.get('duration')).toBe('480')
		expect(url.searchParams.get('addMin')).toBe('10')
		expect(url.searchParams.get('addMax')).toBe('90')
	})
})
