import type { Puzzle } from '$lib/models/Puzzle'
import type { Quiz } from '$lib/models/Quiz'
import type { QuizStats } from '$lib/models/QuizStats'
import type { AdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
import type { LastResults } from '$lib/stores'
import { QuizState } from '$lib/constants/QuizState'
import { getQuizStats } from './statsHelper'

export type QuizAction =
	| { type: 'getReady'; quiz: Quiz }
	| { type: 'start' }
	| { type: 'abort' }
	| { type: 'complete'; puzzles: Puzzle[] }
	| { type: 'reset' }
	| { type: 'showResults' }

export interface QuizLocalState {
	quiz: Quiz
	puzzleSet: Puzzle[] | undefined
	quizStats: QuizStats | undefined
	preQuizSkill: AdaptiveSkillMap
	animateSkill: boolean
	showSettings: boolean
}

export interface StoreSnapshot {
	adaptiveSkills: AdaptiveSkillMap
	lastResults: LastResults | null
}

export interface ReducerResult {
	local: QuizLocalState
	scrollToTop: boolean
}

export const validTransitions: Record<
	QuizState,
	readonly QuizAction['type'][]
> = {
	[QuizState.Initial]: ['getReady', 'showResults'],
	[QuizState.AboutToStart]: ['start', 'abort'],
	[QuizState.Started]: ['complete', 'abort'],
	[QuizState.Completed]: ['getReady', 'reset']
}

export function quizReducer(
	state: QuizLocalState,
	stores: StoreSnapshot,
	action: QuizAction
): ReducerResult | null {
	if (!validTransitions[state.quiz.state]?.includes(action.type)) return null

	switch (action.type) {
		case 'getReady': {
			const quiz = { ...action.quiz }
			quiz.state = QuizState.AboutToStart
			quiz.adaptiveSkillByOperator = [...stores.adaptiveSkills]
			return {
				local: {
					...state,
					quiz,
					preQuizSkill: [...quiz.adaptiveSkillByOperator],
					showSettings: false
				},
				scrollToTop: true
			}
		}
		case 'start':
			return {
				local: {
					...state,
					quiz: { ...state.quiz, state: QuizState.Started }
				},
				scrollToTop: false
			}
		case 'abort':
			return {
				local: {
					...state,
					quiz: { ...state.quiz, state: QuizState.Initial }
				},
				scrollToTop: false
			}
		case 'complete': {
			const puzzleSet = action.puzzles
			const quizStats = getQuizStats(puzzleSet)
			return {
				local: {
					...state,
					quiz: { ...state.quiz, state: QuizState.Completed },
					puzzleSet,
					quizStats,
					animateSkill: true
				},
				scrollToTop: false
			}
		}
		case 'reset':
			return {
				local: {
					...state,
					quiz: { ...state.quiz, state: QuizState.Initial }
				},
				scrollToTop: true
			}
		case 'showResults': {
			let puzzleSet = state.puzzleSet
			let quizStats = state.quizStats
			let quiz = state.quiz
			let preQuizSkill = state.preQuizSkill

			if (!puzzleSet?.length && stores.lastResults) {
				puzzleSet = stores.lastResults.puzzleSet
				quizStats = stores.lastResults.quizStats
				quiz = { ...stores.lastResults.quiz }
				preQuizSkill = stores.lastResults.preQuizSkill ?? [
					...quiz.adaptiveSkillByOperator
				]
			}

			return {
				local: {
					...state,
					quiz: { ...quiz, state: QuizState.Completed },
					puzzleSet,
					quizStats,
					preQuizSkill,
					animateSkill: false
				},
				scrollToTop: true
			}
		}
	}
}
