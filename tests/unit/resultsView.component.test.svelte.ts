// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, fireEvent } from '@testing-library/svelte'
import { tick } from 'svelte'
import { Operator } from '$lib/constants/Operator'
import { PuzzleMode } from '$lib/constants/PuzzleMode'
import type { Quiz } from '$lib/models/Quiz'
import type { Puzzle, PuzzlePartSet } from '$lib/models/Puzzle'
import type { QuizStats } from '$lib/models/QuizStats'
import type { AdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
import type {
	ConceptPerformance,
	ConceptWeakness,
	PuzzleConcept
} from '$lib/models/PuzzleConcept'
import type { FeedbackMessage } from '$lib/helpers/feedbackHelper'
import { createTestQuiz } from './component-setup'
import {
	heading_results,
	heading_puzzles,
	heading_skill_level,
	alert_no_completed,
	label_show_answer_key,
	button_start
} from '$lib/paraglide/messages.js'
import ResultsViewWithStickyNavContextHarness from './mocks/ResultsViewWithStickyNavContextHarness.svelte'

const {
	mockBuildConceptPerformanceMap,
	mockGetTopSystematicWeakness,
	mockGenerateFeedbackMessage
} = vi.hoisted(() => ({
	mockBuildConceptPerformanceMap: vi.fn<
		(puzzles: Puzzle[]) => Map<PuzzleConcept, ConceptPerformance>
	>(() => new Map()),
	mockGetTopSystematicWeakness: vi.fn<
		(
			conceptStats: Map<PuzzleConcept, ConceptPerformance>
		) => ConceptWeakness | null
	>(() => null),
	mockGenerateFeedbackMessage: vi.fn<
		(weakness: ConceptWeakness | null) => FeedbackMessage | null
	>(() => null)
}))

vi.mock('$lib/helpers/errorPatternHelper', () => ({
	buildConceptPerformanceMap: mockBuildConceptPerformanceMap,
	getTopSystematicWeakness: mockGetTopSystematicWeakness
}))

vi.mock('$lib/helpers/feedbackHelper', () => ({
	generateFeedbackMessage: mockGenerateFeedbackMessage
}))

// Polyfill element.animate for jsdom (used by Svelte transitions)
vi.mock('$lib/paraglide/messages.js', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('$lib/paraglide/messages.js')>()

	return {
		...actual,
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
	}
})

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
	return createTestQuiz({
		difficulty: 1,
		adaptiveSkillByOperator: [50, 0, 0, 0],
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
	preQuizSkill?: AdaptiveSkillMap
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
	const preQuizSkill: AdaptiveSkillMap = overrides?.preQuizSkill ?? [
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
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		cleanup()
		vi.useRealTimers()
	})

	beforeEach(() => {
		mockBuildConceptPerformanceMap.mockReset()
		mockGetTopSystematicWeakness.mockReset()
		mockGenerateFeedbackMessage.mockReset()

		mockBuildConceptPerformanceMap.mockReturnValue(new Map())
		mockGetTopSystematicWeakness.mockReturnValue(null)
		mockGenerateFeedbackMessage.mockReturnValue(null)
	})

	async function renderAndFlush(
		overrides?: Parameters<typeof renderResults>[0]
	) {
		const result = renderResults(overrides)
		// Flush onMount timers (alert/skill animation timing) before assertions.
		vi.runAllTimers()
		await tick()
		return result
	}

	describe('rendering', () => {
		it('shows the results heading', async () => {
			const { getByTestId } = await renderAndFlush()
			expect(getByTestId('heading-results').textContent).toBe(heading_results())
		})

		it('shows the puzzles heading', async () => {
			const { getByTestId } = await renderAndFlush()
			expect(getByTestId('heading-puzzles').textContent).toBe(heading_puzzles())
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
			expect(container.textContent).toContain(alert_no_completed())
		})
	})

	describe('show answer key checkbox', () => {
		it('shows answer key checkbox when not 100% correct', async () => {
			const { container } = await renderAndFlush({
				quizStats: createStats({ correctAnswerPercentage: 75 })
			})
			expect(container.querySelector('input[type="checkbox"]')).toBeTruthy()
			expect(container.textContent).toContain(label_show_answer_key())
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
				heading_skill_level()
			)
		})
	})

	describe('feedback alert', () => {
		it('falls back to puzzle-set analysis when serialized concept stats are absent', async () => {
			const mapped = new Map<PuzzleConcept, ConceptPerformance>()
			mockBuildConceptPerformanceMap.mockReturnValue(mapped)

			await renderAndFlush({ quizStats: createStats() })

			expect(mockBuildConceptPerformanceMap).toHaveBeenCalledOnce()
			expect(mockGetTopSystematicWeakness).toHaveBeenCalledWith(mapped)
		})

		it('renders feedback title, concept, accuracy and action item', async () => {
			mockGetTopSystematicWeakness.mockReturnValue({
				concept: 'division-algebraic',
				failureCount: 3,
				totalAttempts: 4,
				accuracy: 0.25,
				avgDuration: 2,
				isSystematic: true
			})
			mockGenerateFeedbackMessage.mockReturnValue({
				title: 'Next focus',
				concept: 'Division - missing number',
				accuracy: '25% accuracy (1 of 4 correct)',
				actionItem: 'Practice linking division to multiplication.'
			})

			const { container } = await renderAndFlush()
			expect(container.textContent).toContain('Next focus')
			expect(container.textContent).toContain('Division - missing number')
			expect(container.textContent).toContain('25% accuracy (1 of 4 correct)')
			expect(container.textContent).toContain(
				'Practice linking division to multiplication.'
			)
		})
	})

	describe('action buttons', () => {
		it('renders start and menu buttons', async () => {
			const { getByTestId } = await renderAndFlush()
			expect(getByTestId('btn-start').textContent).toBe(button_start())
			expect(getByTestId('btn-menu')).toBeTruthy()
		})

		it('calls onGetReady when start button is clicked', async () => {
			const onGetReady = vi.fn()
			const { getByTestId } = await renderAndFlush({ onGetReady })
			await fireEvent.click(getByTestId('btn-start'))
			expect(onGetReady).toHaveBeenCalledOnce()
		})
	})
})
