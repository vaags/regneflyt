import { describe, expect, it } from 'vitest'
import { QuizState } from '$lib/constants/QuizState'
import type { AdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
import { getQuiz } from '$lib/helpers/quiz/quizHelper'
import { buildQuizParams } from '$lib/helpers/urlParamsHelper'
import {
	resetQuizForRouteEntry,
	resolveMenuQuiz,
	resolveQuizRouteEntryState,
	resolveResultsFallbackQuiz
} from '$lib/helpers/quiz/quizStateHelper'

describe('quizStateHelper', () => {
	it('resolves menu quiz with injected adaptive skills', () => {
		const adaptiveSkills: AdaptiveSkillMap = [10, 20, 30, 40]

		const quiz = resolveMenuQuiz(
			{
				duration: 3,
				showProgressBar: true,
				operator: 2,
				addMin: 1,
				addMax: 20,
				subMin: 1,
				subMax: 20,
				mulValues: [3, 5],
				divValues: [2, 4],
				puzzleMode: 2,
				difficulty: 0,
				allowNegativeAnswers: true,
				seed: undefined
			},
			adaptiveSkills
		)

		expect(quiz.adaptiveSkillByOperator).toEqual(adaptiveSkills)
		expect(quiz.duration).toBe(3)
	})

	it('resets quiz state for route entry without changing other fields', () => {
		const sourceQuiz = getQuiz(new URLSearchParams('duration=3&operator=3'))
		sourceQuiz.state = QuizState.Started

		const quiz = resetQuizForRouteEntry(sourceQuiz)

		expect(quiz.state).toBe(QuizState.AboutToStart)
		expect(quiz.seed).toBe(sourceQuiz.seed)
		expect(quiz.selectedOperator).toBe(sourceQuiz.selectedOperator)
	})

	it('resolves results fallback quiz from menu url', () => {
		const sourceQuiz = getQuiz(
			new URLSearchParams('duration=5&operator=1&difficulty=0')
		)
		const menuUrl = `/?${buildQuizParams(sourceQuiz)}`

		const quiz = resolveResultsFallbackQuiz(menuUrl)

		expect(quiz.duration).toBe(5)
		expect(quiz.selectedOperator).toBe(sourceQuiz.selectedOperator)
		expect(quiz.difficulty).toBe(sourceQuiz.difficulty)
	})

	it('returns ready entry state with pre-quiz skill snapshot', () => {
		const adaptiveSkills = [11, 22, 33, 44] as const

		const state = resolveQuizRouteEntryState({
			query: {
				duration: 0.5,
				showProgressBar: false,
				operator: 0,
				addMin: 1,
				addMax: 20,
				subMin: 1,
				subMax: 20,
				mulValues: [7],
				divValues: [5],
				puzzleMode: 0,
				difficulty: 1,
				allowNegativeAnswers: false,
				seed: undefined
			},
			adaptiveSkills: [...adaptiveSkills]
		})

		expect(state.quiz.state).toBe(QuizState.AboutToStart)
		expect(state.preQuizSkill).toEqual(adaptiveSkills)
	})
})
