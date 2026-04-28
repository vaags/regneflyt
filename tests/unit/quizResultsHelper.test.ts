import { describe, expect, it, vi } from 'vitest'
import { Operator } from '$lib/constants/Operator'
import { createTestQuiz } from './component-setup'
import type { Puzzle } from '$lib/models/Puzzle'
import {
	buildCompletedQuizResultsUrl,
	persistCompletedQuiz
} from '$lib/helpers/quiz/quizResultsHelper'

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

	it('does not persist skill when completing a replay quiz', () => {
		const setAdaptiveSkills = vi.fn()
		const setLastResults = vi.fn()
		const replayPuzzles = [
			createPuzzle({ a: 19, b: 8, isCorrect: true, duration: 0.3 })
		]
		const quiz = createTestQuiz({
			adaptiveSkillByOperator: [12, 0, 0, 0],
			replayPuzzles
		})
		const preQuizSkill = [...quiz.adaptiveSkillByOperator] as [
			number,
			number,
			number,
			number
		]

		const results = persistCompletedQuiz(quiz, replayPuzzles, preQuizSkill, {
			setAdaptiveSkills,
			setLastResults
		})

		expect(results.quiz.replayPuzzles).toEqual(replayPuzzles)
		expect(setAdaptiveSkills).not.toHaveBeenCalled()
		expect(setLastResults).toHaveBeenCalledWith(results)
	})

	it('skill stays flat across repeated replays', () => {
		const setAdaptiveSkills = vi.fn()
		const setLastResults = vi.fn()
		const replayPuzzles = [
			createPuzzle({ a: 19, b: 8, isCorrect: true, duration: 0.2 }),
			createPuzzle({ a: 27, b: 9, isCorrect: true, duration: 0.2 }),
			createPuzzle({ a: 18, b: 7, isCorrect: true, duration: 0.2 })
		]
		const quiz = createTestQuiz({
			adaptiveSkillByOperator: [40, 0, 0, 0],
			replayPuzzles
		})

		for (let replayIndex = 0; replayIndex < 3; replayIndex++) {
			const preQuizSkill = [...quiz.adaptiveSkillByOperator] as [
				number,
				number,
				number,
				number
			]
			persistCompletedQuiz(quiz, replayPuzzles, preQuizSkill, {
				setAdaptiveSkills,
				setLastResults
			})
		}

		expect(setAdaptiveSkills).not.toHaveBeenCalled()
		expect(setLastResults).toHaveBeenCalledTimes(3)
	})

	it('fresh quiz (no replayPuzzles) still persists skill', () => {
		const setAdaptiveSkills = vi.fn()
		const setLastResults = vi.fn()
		const quiz = createTestQuiz({
			adaptiveSkillByOperator: [30, 0, 0, 0]
		})

		persistCompletedQuiz(
			quiz,
			[createPuzzle({ isCorrect: true })],
			[...quiz.adaptiveSkillByOperator] as [number, number, number, number],
			{ setAdaptiveSkills, setLastResults }
		)

		expect(setAdaptiveSkills).toHaveBeenCalledWith([30, 0, 0, 0])
		expect(setLastResults).toHaveBeenCalledOnce()
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
