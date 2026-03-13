import { describe, expect, it } from 'vitest'
import {
	quizReducer,
	validTransitions,
	type QuizLocalState,
	type StoreSnapshot
} from '../../src/helpers/quizStateMachine'
import { QuizState } from '../../src/models/constants/QuizState'
import { Operator } from '../../src/models/constants/Operator'
import { PuzzleMode } from '../../src/models/constants/PuzzleMode'
import type { Quiz, OperatorSettingsByOperator } from '../../src/models/Quiz'
import type { Puzzle, PuzzlePartSet } from '../../src/models/Puzzle'
import {
	defaultAdaptiveSkillMap,
	type AdaptiveSkillMap
} from '../../src/models/AdaptiveProfile'

const defaultOperatorSettings: OperatorSettingsByOperator = [
	{ operator: Operator.Addition, range: [1, 10], possibleValues: [] },
	{ operator: Operator.Subtraction, range: [1, 10], possibleValues: [] },
	{ operator: Operator.Multiplication, range: [1, 10], possibleValues: [] },
	{ operator: Operator.Division, range: [1, 10], possibleValues: [] }
]

function makeQuiz(overrides: Partial<Quiz> = {}): Quiz {
	return {
		title: undefined,
		duration: 60,
		hidePuzzleProgressBar: false,
		operatorSettings: defaultOperatorSettings,
		state: QuizState.Initial,
		selectedOperator: undefined,
		puzzleMode: PuzzleMode.Normal,
		showSettings: false,
		difficulty: undefined,
		allowNegativeAnswers: false,
		adaptiveSkillByOperator: [...defaultAdaptiveSkillMap],
		...overrides
	}
}

const emptyPartSet: PuzzlePartSet = [
	{ userDefinedValue: undefined, generatedValue: 0 },
	{ userDefinedValue: undefined, generatedValue: 0 },
	{ userDefinedValue: undefined, generatedValue: 0 }
]

function makePuzzle(overrides: Partial<Puzzle> = {}): Puzzle {
	return {
		parts: emptyPartSet,
		duration: 2,
		isCorrect: true,
		operator: Operator.Addition,
		unknownPartIndex: 2 as const,
		...overrides
	}
}

function makeState(overrides: Partial<QuizLocalState> = {}): QuizLocalState {
	return {
		quiz: makeQuiz(),
		puzzleSet: undefined,
		quizStats: undefined,
		preQuizSkill: [...defaultAdaptiveSkillMap],
		animateSkill: false,
		showWelcomePanel: true,
		...overrides
	}
}

function makeStores(overrides: Partial<StoreSnapshot> = {}): StoreSnapshot {
	return {
		adaptiveSkills: [...defaultAdaptiveSkillMap],
		lastResults: null,
		...overrides
	}
}

describe('quizStateMachine', () => {
	describe('validTransitions', () => {
		it('allows getReady and showResults from Initial', () => {
			expect(validTransitions[QuizState.Initial]).toContain('getReady')
			expect(validTransitions[QuizState.Initial]).toContain('showResults')
		})

		it('allows start and abort from AboutToStart', () => {
			expect(validTransitions[QuizState.AboutToStart]).toContain('start')
			expect(validTransitions[QuizState.AboutToStart]).toContain('abort')
		})

		it('allows complete and abort from Started', () => {
			expect(validTransitions[QuizState.Started]).toContain('complete')
			expect(validTransitions[QuizState.Started]).toContain('abort')
		})

		it('allows getReady and reset from Completed', () => {
			expect(validTransitions[QuizState.Completed]).toContain('getReady')
			expect(validTransitions[QuizState.Completed]).toContain('reset')
		})
	})

	describe('invalid transitions', () => {
		it('returns null for start from Initial', () => {
			const result = quizReducer(makeState(), makeStores(), { type: 'start' })
			expect(result).toBeNull()
		})

		it('returns null for complete from Initial', () => {
			const result = quizReducer(makeState(), makeStores(), {
				type: 'complete',
				puzzles: []
			})
			expect(result).toBeNull()
		})

		it('returns null for reset from Initial', () => {
			const result = quizReducer(makeState(), makeStores(), { type: 'reset' })
			expect(result).toBeNull()
		})

		it('returns null for getReady from Started', () => {
			const state = makeState({ quiz: makeQuiz({ state: QuizState.Started }) })
			const result = quizReducer(state, makeStores(), {
				type: 'getReady',
				quiz: makeQuiz()
			})
			expect(result).toBeNull()
		})
	})

	describe('getReady', () => {
		it('copies adaptive skills from store onto quiz', () => {
			const skills: AdaptiveSkillMap = [10, 20, 30, 40]
			const result = quizReducer(
				makeState(),
				makeStores({ adaptiveSkills: skills }),
				{ type: 'getReady', quiz: makeQuiz() }
			)!
			expect(result.local.quiz.state).toBe(QuizState.AboutToStart)
			expect(result.local.quiz.adaptiveSkillByOperator).toEqual(skills)
			expect(result.local.preQuizSkill).toEqual(skills)
		})

		it('hides welcome panel and scrolls to top', () => {
			const result = quizReducer(makeState(), makeStores(), {
				type: 'getReady',
				quiz: makeQuiz()
			})!
			expect(result.local.showWelcomePanel).toBe(false)
			expect(result.scrollToTop).toBe(true)
		})
	})

	describe('complete', () => {
		const puzzles = [
			makePuzzle({ isCorrect: true, duration: 3 }),
			makePuzzle({ isCorrect: false, duration: 5 })
		]

		function completeState() {
			return makeState({
				quiz: makeQuiz({
					state: QuizState.Started,
					adaptiveSkillByOperator: [5, 10, 15, 20]
				})
			})
		}

		it('computes quiz stats', () => {
			const result = quizReducer(completeState(), makeStores(), {
				type: 'complete',
				puzzles
			})!
			expect(result.local.quiz.state).toBe(QuizState.Completed)
			expect(result.local.puzzleSet).toBe(puzzles)
			expect(result.local.quizStats!.correctAnswerCount).toBe(1)
			expect(result.local.quizStats!.correctAnswerPercentage).toBe(50)
			expect(result.local.animateSkill).toBe(true)
		})
	})

	describe('reset', () => {
		it('transitions to Initial and scrolls to top', () => {
			const state = makeState({
				quiz: makeQuiz({ state: QuizState.Completed })
			})
			const result = quizReducer(state, makeStores(), { type: 'reset' })!
			expect(result.local.quiz.state).toBe(QuizState.Initial)
			expect(result.scrollToTop).toBe(true)
		})
	})

	describe('showResults', () => {
		it('restores from lastResults when no local puzzleSet', () => {
			const savedPuzzles = [makePuzzle()]
			const savedQuiz = makeQuiz({
				state: QuizState.Completed,
				duration: 90
			})
			const stores = makeStores({
				lastResults: {
					puzzleSet: savedPuzzles,
					quizStats: {
						correctAnswerCount: 1,
						correctAnswerPercentage: 100,
						starCount: 0
					},
					quiz: savedQuiz,
					preQuizSkill: [1, 2, 3, 4]
				}
			})
			const result = quizReducer(makeState(), stores, {
				type: 'showResults'
			})!
			expect(result.local.quiz.state).toBe(QuizState.Completed)
			expect(result.local.puzzleSet).toBe(savedPuzzles)
			expect(result.local.quizStats!.correctAnswerCount).toBe(1)
			expect(result.local.preQuizSkill).toEqual([1, 2, 3, 4])
			expect(result.local.animateSkill).toBe(false)
			expect(result.scrollToTop).toBe(true)
		})

		it('keeps local puzzleSet when present', () => {
			const localPuzzles = [makePuzzle(), makePuzzle()]
			const state = makeState({ puzzleSet: localPuzzles })
			const stores = makeStores({
				lastResults: {
					puzzleSet: [makePuzzle()],
					quizStats: {
						correctAnswerCount: 1,
						correctAnswerPercentage: 100,
						starCount: 0
					},
					quiz: makeQuiz(),
					preQuizSkill: [1, 2, 3, 4]
				}
			})
			const result = quizReducer(state, stores, { type: 'showResults' })!
			expect(result.local.puzzleSet).toBe(localPuzzles)
		})
	})
})
