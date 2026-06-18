import { describe, expect, it, vi } from 'vitest'
import { Operator } from '$lib/constants/Operator'
import type { Puzzle } from '$lib/models/Puzzle'
import {
	buildCompletedQuizResultsUrl,
	persistCompletedQuiz
} from '$lib/helpers/quiz/quizResultsHelper'
import { createTestQuiz } from './component-setup'

function createPuzzle({
	a = 2,
	b = 3,
	c = a + b,
	isCorrect,
	duration = 1
}: {
	a?: number
	b?: number
	c?: number
	isCorrect: boolean
	duration?: number
}): Puzzle {
	return {
		parts: [
			{ generatedValue: a, userDefinedValue: a },
			{ generatedValue: b, userDefinedValue: b },
			{ generatedValue: c, userDefinedValue: isCorrect ? c : c - 1 }
		],
		duration,
		isCorrect,
		operator: Operator.Addition,
		unknownPartIndex: 2 as const
	}
}

describe('quizResultsHelper', () => {
	it('persists completed quiz results and updates dependent state', () => {
		const setAdaptiveSkills = vi.fn()
		const setLastResults = vi.fn()
		const quiz = createTestQuiz({
			seed: 42,
			adaptiveSkillByOperator: [10, 20, 30, 40]
		})
		const puzzleSet = [
			createPuzzle({ isCorrect: true }),
			createPuzzle({ isCorrect: false })
		]
		const preQuizSkill = [1, 2, 3, 4] as const

		const results = persistCompletedQuiz(quiz, puzzleSet, [...preQuizSkill], {
			setAdaptiveSkills,
			setLastResults
		})

		expect(results.quiz).toEqual(quiz)
		expect(results.puzzleSet).toEqual(puzzleSet)
		expect(results.preQuizSkill).toEqual(preQuizSkill)
		expect(results.quizStats.correctAnswerCount).toBe(1)
		expect(results.quizStats.correctAnswerPercentage).toBe(50)
		expect(setAdaptiveSkills).toHaveBeenCalledWith([10, 20, 30, 40])
		expect(setLastResults).toHaveBeenCalledWith(results)
	})

	it('falls back to current quiz skills when pre-quiz skill is unavailable', () => {
		const quiz = createTestQuiz({
			adaptiveSkillByOperator: [7, 8, 9, 10]
		})
		const results = persistCompletedQuiz(
			quiz,
			[createPuzzle({ isCorrect: true })],
			undefined,
			{
				setAdaptiveSkills: vi.fn(),
				setLastResults: vi.fn()
			}
		)

		expect(results.preQuizSkill).toEqual([7, 8, 9, 10])
	})

	it('builds results url with animate flag and canonical quiz params', () => {
		const quiz = createTestQuiz({
			duration: 3,
			seed: 99,
			selectedOperator: Operator.Division
		})

		const url = buildCompletedQuizResultsUrl(quiz)
		const parsedUrl = new URL(url, 'https://example.com')

		expect(parsedUrl.pathname).toBe('/results')
		expect(parsedUrl.searchParams.get('animate')).toBe('true')
		expect(parsedUrl.searchParams.get('duration')).toBe('3')
		expect(parsedUrl.searchParams.get('operator')).toBe(
			Operator.Division.toString()
		)
	})
})
