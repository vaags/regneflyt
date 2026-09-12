// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, fireEvent } from '@testing-library/svelte'
import { Operator } from '#lib/domain/arithmetic/operator.ts'
import { PuzzleMode } from '#lib/domain/puzzle-generation/puzzleMode.ts'
import type { Quiz } from '#lib/domain/quiz/quiz.ts'
import type {
	Puzzle,
	PuzzlePartSet
} from '#lib/domain/puzzle-generation/puzzle.ts'
import type { QuizStats } from '#lib/models/QuizStats.ts'
import type { OperatorSkillMap } from '#lib/domain/skill-progression/skillModel.ts'
import { createTestQuiz } from './component-setup'
import {
	heading_results,
	heading_puzzles,
	heading_skill_level,
	alert_no_completed,
	label_show_answer_key,
	button_start
} from '#lib/paraglide/messages.js'
import ResultsViewWithStickyNavContextHarness from './mocks/ResultsViewWithStickyNavContextHarness.svelte'

vi.mock('#lib/paraglide/messages.js', async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>()

	return {
		...actual,
		heading_results: () => 'Results',
		heading_skill_level: () => 'Skill level',
		heading_puzzles: () => 'Puzzles',
		alert_no_completed: () => 'No puzzles completed',
		label_correct: () => 'Correct',
		label_incorrect: () => 'Incorrect',
		label_seconds_unit: () => 's',
		label_regneflyt: () => 'Star',
		label_show_answer_key: () => 'Show answer key',
		label_stars: () => 'Stars',
		label_of: () => 'of',
		sr_column_number: () => '#',
		sr_column_puzzle: () => 'Puzzle',
		sr_column_result: () => 'Result',
		sr_column_time: () => 'Time',
		sr_column_star: () => 'Star',
		button_start: () => 'Start',
		button_menu: () => 'Menu',
		button_close: () => 'Close',
		operator_addition: () => 'Addition',
		operator_subtraction: () => 'Subtraction',
		operator_multiplication: () => 'Multiplication',
		operator_division: () => 'Division',
		operator_all: () => 'All',
		label_operator_fallback: () => 'Quiz',
		difficulty_adaptive: () => 'Adaptive',
		difficulty_custom: () => 'Custom'
	}
})

vi.mock('#lib/paraglide/runtime.js', () => ({
	getLocale: () => 'en',
	experimentalStaticLocale: 'en'
}))

function createParts(a: number, b: number, c: number): PuzzlePartSet {
	return [
		{ generatedValue: a, userDefinedValue: undefined },
		{ generatedValue: b, userDefinedValue: undefined },
		{ generatedValue: c, userDefinedValue: c }
	]
}

function createPuzzle(overrides: Partial<Puzzle> = {}): Puzzle {
	return {
		parts: createParts(3, 4, 7),
		duration: 2.5,
		isCorrect: true,
		operator: Operator.Addition,
		puzzleMode: PuzzleMode.Normal,
		unknownPartIndex: 2,
		...overrides
	}
}

function createQuiz(overrides: Partial<Quiz> = {}): Quiz {
	return createTestQuiz({
		difficulty: 1,
		skillByOperator: [50, 0, 0, 0],
		...overrides
	})
}

function createStats(overrides: Partial<QuizStats> = {}): QuizStats {
	return {
		correctAnswerCount: 3,
		correctAnswerPercentage: 75,
		starCount: 2,
		...overrides
	}
}

function renderResults(overrides?: {
	puzzleSet?: Puzzle[]
	quizStats?: QuizStats
	quiz?: Quiz
	preQuizSkill?: OperatorSkillMap
	animateSkill?: boolean
	onGetReady?: (quiz: Quiz) => void
}) {
	const puzzleSet = overrides?.puzzleSet ?? [
		createPuzzle({ isCorrect: true }),
		createPuzzle({ isCorrect: false }),
		createPuzzle({ isCorrect: true }),
		createPuzzle({ isCorrect: true })
	]
	const quizStats = overrides?.quizStats ?? createStats()
	const quiz = overrides?.quiz ?? createQuiz()
	const preQuizSkill: OperatorSkillMap = overrides?.preQuizSkill ?? [
		40, 0, 0, 0
	]

	return render(ResultsViewWithStickyNavContextHarness, {
		props: {
			puzzleSet,
			quizStats,
			quiz,
			preQuizSkill,
			animateSkill: overrides?.animateSkill ?? false,
			onGetReady: overrides?.onGetReady ?? (() => {})
		}
	})
}

describe('ResultsView', () => {
	afterEach(cleanup)

	describe('rendering', () => {
		it('shows the results heading', () => {
			const { getByTestId } = renderResults()
			expect(getByTestId('heading-results').textContent).toBe(heading_results())
		})

		it('shows the puzzles heading', () => {
			const { getByTestId } = renderResults()
			expect(getByTestId('heading-puzzles').textContent).toBe(heading_puzzles())
		})

		it('displays correct and incorrect icons', () => {
			const puzzleSet = [
				createPuzzle({ isCorrect: true }),
				createPuzzle({ isCorrect: false })
			]
			const { getAllByTestId } = renderResults({
				puzzleSet,
				quizStats: createStats({
					correctAnswerCount: 1,
					correctAnswerPercentage: 50,
					starCount: 0
				})
			})
			expect(getAllByTestId('icon-correct')).toHaveLength(1)
			expect(getAllByTestId('icon-incorrect')).toHaveLength(1)
		})

		it('binds summary stats (percentage, fraction, stars) to the UI', () => {
			const { getByTestId } = renderResults({
				puzzleSet: [
					createPuzzle({ isCorrect: true }),
					createPuzzle({ isCorrect: true }),
					createPuzzle({ isCorrect: false })
				],
				quizStats: createStats({
					correctAnswerCount: 2,
					correctAnswerPercentage: 67,
					starCount: 5
				})
			})

			expect(getByTestId('results-summary-percentage').textContent.trim()).toBe(
				'67%'
			)

			const cardText = getByTestId('results-summary-card').textContent
			// fraction: correctAnswerCount (2) of puzzleSet.length (3)
			expect(cardText).toContain('2')
			expect(cardText).toContain('3')
			// star count
			expect(cardText).toContain('5')
		})
	})

	describe('empty puzzle set', () => {
		it('shows no-completed alert when puzzle set is empty', () => {
			const { container } = renderResults({
				puzzleSet: [],
				quizStats: createStats({
					correctAnswerCount: 0,
					correctAnswerPercentage: 0,
					starCount: 0
				})
			})
			expect(container.textContent).toContain(alert_no_completed())
		})
	})

	describe('show answer key checkbox', () => {
		it('shows answer key checkbox when not 100% correct', () => {
			const { container } = renderResults({
				quizStats: createStats({ correctAnswerPercentage: 75 })
			})
			expect(container.querySelector('input[type="checkbox"]')).toBeTruthy()
			expect(container.textContent).toContain(label_show_answer_key())
		})

		it('hides answer key checkbox when 100% correct', () => {
			const puzzleSet = [createPuzzle({ isCorrect: true })]
			const { container } = renderResults({
				puzzleSet,
				quizStats: createStats({
					correctAnswerCount: 1,
					correctAnswerPercentage: 100,
					starCount: 1
				})
			})
			expect(container.querySelector('input[type="checkbox"]')).toBeNull()
		})
	})

	describe('skill level display', () => {
		it('shows skill level heading', () => {
			const { getByTestId } = renderResults()
			expect(getByTestId('heading-results-skill').textContent).toBe(
				heading_skill_level()
			)
		})
	})

	describe('action buttons', () => {
		it('renders start and menu buttons', () => {
			const { getByTestId } = renderResults()
			expect(getByTestId('btn-start').textContent).toBe(button_start())
			expect(getByTestId('btn-menu')).toBeTruthy()
		})

		it('calls onGetReady when start button is clicked', async () => {
			const onGetReady = vi.fn()
			const { getByTestId } = renderResults({ onGetReady })
			await fireEvent.click(getByTestId('btn-start'))
			expect(onGetReady).toHaveBeenCalledOnce()
		})
	})
})
