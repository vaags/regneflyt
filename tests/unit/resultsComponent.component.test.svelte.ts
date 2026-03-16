// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, fireEvent } from '@testing-library/svelte'
import { tick } from 'svelte'
import ResultsComponent from '$lib/components/screens/ResultsComponent.svelte'
import { Operator } from '$lib/constants/Operator'
import { PuzzleMode } from '$lib/constants/PuzzleMode'
import { QuizState } from '$lib/constants/QuizState'
import type { Quiz } from '$lib/models/Quiz'
import type { Puzzle, PuzzlePartSet } from '$lib/models/Puzzle'
import type { QuizStats } from '$lib/models/QuizStats'
import type { AdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
// Polyfill element.animate for jsdom (used by Svelte transitions)
if (typeof Element.prototype.animate !== 'function') {
	Element.prototype.animate = function () {
		return {
			cancel: () => {},
			finish: () => {},
			pause: () => {},
			play: () => {},
			reverse: () => {},
			onfinish: null,
			finished: Promise.resolve()
		} as unknown as Animation
	}
}

vi.mock('$lib/paraglide/messages.js', () => ({
	heading_results: () => 'Results',
	heading_skill_level: () => 'Skill level',
	heading_puzzles: () => 'Puzzles',
	alert_time_up: () => 'Time is up!',
	alert_no_completed: () => 'No puzzles completed',
	label_correct: () => 'Correct',
	label_incorrect: () => 'Incorrect',
	label_seconds_unit: () => 's',
	label_regneflyt: () => 'Star',
	label_show_answer_key: () => 'Show answer key',
	label_stars: () => 'Stars',
	label_of: () => 'of',
	label_total: () => 'Total',
	sr_column_number: () => '#',
	sr_column_puzzle: () => 'Puzzle',
	sr_column_result: () => 'Result',
	sr_column_time: () => 'Time',
	sr_column_star: () => 'Star',
	button_start: () => 'Start',
	button_replay: () => 'Replay',
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
}))

vi.mock('$lib/paraglide/runtime.js', () => ({
	getLocale: () => 'en'
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
	return {
		title: undefined,
		duration: 0,
		showPuzzleProgressBar: true,
		operatorSettings: [
			{ operator: Operator.Addition, range: [1, 10], possibleValues: [] },
			{ operator: Operator.Subtraction, range: [1, 10], possibleValues: [] },
			{
				operator: Operator.Multiplication,
				range: [1, 10],
				possibleValues: [2, 3, 4, 5]
			},
			{
				operator: Operator.Division,
				range: [1, 10],
				possibleValues: [2, 3, 4, 5]
			}
		],
		state: QuizState.Started,
		selectedOperator: Operator.Addition,
		puzzleMode: PuzzleMode.Normal,
		showSettings: true,
		difficulty: 1,
		allowNegativeAnswers: false,
		adaptiveSkillByOperator: [50, 0, 0, 0],
		seed: 0,
		...overrides
	}
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
	preQuizSkill?: AdaptiveSkillMap
	animateSkill?: boolean
	onGetReady?: (quiz: Quiz) => void
	onResetQuiz?: () => void
}) {
	const puzzleSet = overrides?.puzzleSet ?? [
		createPuzzle({ isCorrect: true }),
		createPuzzle({ isCorrect: false }),
		createPuzzle({ isCorrect: true }),
		createPuzzle({ isCorrect: true })
	]
	const quizStats = overrides?.quizStats ?? createStats()
	const quiz = overrides?.quiz ?? createQuiz()
	const preQuizSkill: AdaptiveSkillMap = overrides?.preQuizSkill ?? [
		40, 0, 0, 0
	]

	return render(ResultsComponent, {
		props: {
			puzzleSet,
			quizStats,
			quiz,
			preQuizSkill,
			animateSkill: overrides?.animateSkill ?? false,
			onGetReady: overrides?.onGetReady ?? (() => {}),
			onResetQuiz: overrides?.onResetQuiz ?? (() => {})
		}
	})
}

describe('ResultsComponent', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		cleanup()
		vi.useRealTimers()
	})

	async function renderAndFlush(
		overrides?: Parameters<typeof renderResults>[0]
	) {
		const result = renderResults(overrides)
		// Flush the onMount setTimeout that sets showComponent = true
		vi.runAllTimers()
		await tick()
		return result
	}

	describe('rendering', () => {
		it('shows the results heading', async () => {
			const { getByTestId } = await renderAndFlush()
			expect(getByTestId('heading-results').textContent).toBe('Results')
		})

		it('shows the puzzles heading', async () => {
			const { getByTestId } = await renderAndFlush()
			expect(getByTestId('heading-puzzles').textContent).toBe('Puzzles')
		})

		it('displays correct and incorrect icons', async () => {
			const puzzleSet = [
				createPuzzle({ isCorrect: true }),
				createPuzzle({ isCorrect: false })
			]
			const { getAllByTestId } = await renderAndFlush({
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

		it('shows percentage and fraction', async () => {
			const { container } = await renderAndFlush()
			expect(container.textContent).toContain('75')
			expect(container.textContent).toContain('%')
		})

		it('shows star count', async () => {
			const { container } = await renderAndFlush({
				quizStats: createStats({ starCount: 2 })
			})
			expect(container.textContent).toContain('2')
		})
	})

	describe('empty puzzle set', () => {
		it('shows no-completed alert when puzzle set is empty', async () => {
			const { container } = await renderAndFlush({
				puzzleSet: [],
				quizStats: createStats({
					correctAnswerCount: 0,
					correctAnswerPercentage: 0,
					starCount: 0
				})
			})
			expect(container.textContent).toContain('No puzzles completed')
		})
	})

	describe('show answer key checkbox', () => {
		it('shows answer key checkbox when not 100% correct', async () => {
			const { container } = await renderAndFlush({
				quizStats: createStats({ correctAnswerPercentage: 75 })
			})
			expect(container.querySelector('input[type="checkbox"]')).toBeTruthy()
			expect(container.textContent).toContain('Show answer key')
		})

		it('hides answer key checkbox when 100% correct', async () => {
			const puzzleSet = [createPuzzle({ isCorrect: true })]
			const { container } = await renderAndFlush({
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
		it('shows skill level heading', async () => {
			const { getByTestId } = await renderAndFlush()
			expect(getByTestId('heading-results-skill').textContent).toBe(
				'Skill level'
			)
		})
	})

	describe('action buttons', () => {
		it('renders start and menu buttons', async () => {
			const { getByTestId } = await renderAndFlush()
			expect(getByTestId('btn-start').textContent).toBe('Start')
			expect(getByTestId('btn-menu').textContent).toBe('Menu')
		})

		it('calls onGetReady when start button is clicked', async () => {
			const onGetReady = vi.fn()
			const { getByTestId } = await renderAndFlush({ onGetReady })
			await fireEvent.click(getByTestId('btn-start'))
			expect(onGetReady).toHaveBeenCalledOnce()
		})

		it('calls onResetQuiz when menu button is clicked', async () => {
			const onResetQuiz = vi.fn()
			const { getByTestId } = await renderAndFlush({ onResetQuiz })
			await fireEvent.click(getByTestId('btn-menu'))
			expect(onResetQuiz).toHaveBeenCalledOnce()
		})
	})
})
