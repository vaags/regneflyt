import { describe, expect, it } from 'vitest'
import { QuizState } from '$lib/constants/QuizState'
import type { AdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
import { getQuiz } from '$lib/helpers/quiz/quizHelper'
import { buildQuizParams } from '$lib/helpers/urlParamsHelper'
import {
	resetQuizForRouteEntry,
	resolveMenuQuiz,
	resolveQuizRouteEntryState,
	resolveQuizRouteEntry,
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

	it('returns undefined for replay route when no results exist', () => {
		const quiz = resolveQuizRouteEntry({
			isReplay: true,
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
				seed: 42
			},
			adaptiveSkills: [0, 0, 0, 0],
			results: null
		})

		expect(quiz).toBeUndefined()
	})

	it('resolves replay route using stored results and current adaptive skills', () => {
		const storedQuiz = getQuiz(
			new URLSearchParams('duration=3&operator=2&difficulty=0&seed=99')
		)
		const adaptiveSkills: AdaptiveSkillMap = [5, 6, 7, 8]

		const quiz = resolveQuizRouteEntry({
			isReplay: true,
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
			adaptiveSkills,
			results: {
				puzzleSet: [
					{
						parts: [
							{ generatedValue: 1, userDefinedValue: 1 },
							{ generatedValue: 2, userDefinedValue: 2 },
							{ generatedValue: 3, userDefinedValue: undefined }
						],
						duration: 1,
						isCorrect: true,
						operator: 0,
						unknownPartIndex: 2
					}
				],
				quizStats: {
					correctAnswerCount: 1,
					correctAnswerPercentage: 100,
					starCount: 3
				},
				quiz: storedQuiz
			}
		})

		expect(quiz?.replayPuzzles).toHaveLength(1)
		expect(quiz?.seed).toBe(99)
		expect(quiz?.adaptiveSkillByOperator).toEqual(adaptiveSkills)
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

	it('returns redirect-home entry state for replay route without results', () => {
		const state = resolveQuizRouteEntryState({
			isReplay: true,
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
				seed: 42
			},
			adaptiveSkills: [0, 0, 0, 0],
			results: null
		})

		expect(state).toEqual({ status: 'redirect-home' })
	})

	it('returns ready entry state with pre-quiz skill snapshot', () => {
		const quiz = getQuiz(
			new URLSearchParams('duration=3&operator=0&difficulty=0&seed=9')
		)
		const adaptiveSkills = [11, 22, 33, 44] as const

		const state = resolveQuizRouteEntryState({
			isReplay: false,
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
			adaptiveSkills: [...adaptiveSkills],
			results: {
				puzzleSet: [],
				quizStats: {
					correctAnswerCount: 0,
					correctAnswerPercentage: 0,
					starCount: 0
				},
				quiz
			}
		})

		expect(state.status).toBe('ready')
		if (state.status !== 'ready') return

		expect(state.quiz.state).toBe(QuizState.AboutToStart)
		expect(state.preQuizSkill).toEqual(adaptiveSkills)
	})

	it('uses current adaptive skills as the replay pre-quiz snapshot', () => {
		const storedQuiz = getQuiz(
			new URLSearchParams('duration=3&operator=0&difficulty=0&seed=15')
		)
		storedQuiz.adaptiveSkillByOperator = [1, 2, 3, 4]
		const adaptiveSkills = [9, 8, 7, 6] as const

		const state = resolveQuizRouteEntryState({
			isReplay: true,
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
			adaptiveSkills: [...adaptiveSkills],
			results: {
				puzzleSet: [
					{
						parts: [
							{ generatedValue: 9, userDefinedValue: undefined },
							{ generatedValue: 8, userDefinedValue: undefined },
							{ generatedValue: 17, userDefinedValue: undefined }
						],
						duration: 0.4,
						isCorrect: true,
						operator: 0,
						unknownPartIndex: 2
					}
				],
				quizStats: {
					correctAnswerCount: 1,
					correctAnswerPercentage: 100,
					starCount: 1
				},
				quiz: storedQuiz
			}
		})

		expect(state.status).toBe('ready')
		if (state.status !== 'ready') return

		expect(state.quiz.adaptiveSkillByOperator).toEqual(adaptiveSkills)
		expect(state.preQuizSkill).toEqual(adaptiveSkills)
	})
})
