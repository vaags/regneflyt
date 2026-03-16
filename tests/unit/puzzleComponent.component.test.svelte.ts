// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, fireEvent } from '@testing-library/svelte'
import PuzzleComponent from '$lib/components/screens/PuzzleComponent.svelte'
import { QuizState } from '$lib/constants/QuizState'
import { Operator } from '$lib/constants/Operator'
import { PuzzleMode } from '$lib/constants/PuzzleMode'
import type { Quiz } from '$lib/models/Quiz'
import type { Puzzle } from '$lib/models/Puzzle'
import { AppSettings } from '$lib/constants/AppSettings'

// Polyfill element.animate for jsdom (used by Svelte transitions on rerender)
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

const mockApplySkillUpdate = vi.fn()
vi.mock('$lib/helpers/adaptiveHelper', async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>
	return {
		...actual,
		applySkillUpdate: (...args: unknown[]) => mockApplySkillUpdate(...args)
	}
})

vi.mock('$lib/paraglide/messages.js', () => ({
	getting_ready: () => 'Getting ready',
	puzzle_heading: ({ number }: { number: number }) => `Puzzle ${number}`,
	countdown_go: () => 'Go!',
	countdown_set: () => 'Set',
	countdown_ready: () => 'Ready',
	button_delete: () => 'Delete',
	button_next: () => 'Next',
	button_yes: () => 'Yes',
	button_no: () => 'No',
	cancel_confirm: () => 'Cancel?',
	cancel_undo: () => 'Cancel',
	cancel_complete_quiz: () => 'Complete',
	sr_progress_bar: () => 'Progress',
	sr_numpad: () => 'Number pad',
	sr_puzzle_input: ({ number }: { number: number }) => `Puzzle ${number}`,
	label_incorrect: () => 'Incorrect'
}))

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
		difficulty: 0,
		allowNegativeAnswers: false,
		adaptiveSkillByOperator: [0, 0, 0, 0],
		seed: 0,
		...overrides
	}
}

const puzzleContext = new Map<string, () => void>([
	['startQuiz', () => {}],
	['abortQuiz', () => {}],
	['completeQuiz', () => {}]
])

function renderPuzzle(props?: { onAddPuzzle?: (puzzle: Puzzle) => void }) {
	return render(PuzzleComponent, {
		props: { quiz: createQuiz(), seconds: 0, ...props },
		context: puzzleContext
	})
}

describe('PuzzleComponent', () => {
	afterEach(() => {
		cleanup()
		vi.clearAllMocks()
	})

	describe('answer submission', () => {
		it('shows ? for unknown part initially', () => {
			const { getByTestId } = renderPuzzle()
			expect(getByTestId('puzzle-expression').textContent).toContain('?')
		})

		it('updates display when typing a digit', async () => {
			const { getByTestId } = renderPuzzle()
			await fireEvent.keyDown(window, { key: '5' })
			expect(getByTestId('puzzle-expression').textContent).toContain('5')
		})

		it('calls onAddPuzzle with puzzle structure on submission', async () => {
			const onAddPuzzle = vi.fn()
			renderPuzzle({ onAddPuzzle })

			await fireEvent.keyDown(window, { key: '1' })
			await fireEvent.keyDown(window, { key: 'Enter' })

			expect(onAddPuzzle).toHaveBeenCalledOnce()
			const puzzle = onAddPuzzle.mock.calls[0]![0]
			expect(puzzle).toHaveProperty('operator')
			expect(puzzle).toHaveProperty('parts')
			expect(puzzle).toHaveProperty('isCorrect')
			expect(typeof puzzle.isCorrect).toBe('boolean')
		})

		it('marks incorrect answer as wrong', async () => {
			const onAddPuzzle = vi.fn()
			renderPuzzle({ onAddPuzzle })

			// Type an unlikely-to-be-correct answer
			await fireEvent.keyDown(window, { key: '9' })
			await fireEvent.keyDown(window, { key: '9' })
			await fireEvent.keyDown(window, { key: '9' })
			await fireEvent.keyDown(window, { key: 'Enter' })

			expect(onAddPuzzle).toHaveBeenCalledOnce()
			const puzzle = onAddPuzzle.mock.calls[0]![0]
			expect(puzzle.isCorrect).toBe(false)
		})

		it('does not submit when input is empty', async () => {
			const onAddPuzzle = vi.fn()
			renderPuzzle({ onAddPuzzle })

			await fireEvent.keyDown(window, { key: 'Enter' })

			expect(onAddPuzzle).not.toHaveBeenCalled()
		})

		it('does not submit negative zero as a value', async () => {
			const onAddPuzzle = vi.fn()
			renderPuzzle({ onAddPuzzle })

			// Type minus (creates -0) then try to submit
			await fireEvent.keyDown(window, { key: '-' })
			await fireEvent.keyDown(window, { key: 'Enter' })

			expect(onAddPuzzle).not.toHaveBeenCalled()
		})
	})

	describe('puzzle progression', () => {
		beforeEach(() => vi.useFakeTimers())
		afterEach(() => vi.useRealTimers())

		it('advances to the next puzzle after submission', async () => {
			const onAddPuzzle = vi.fn()
			renderPuzzle({ onAddPuzzle })

			await fireEvent.keyDown(window, { key: '1' })
			await fireEvent.keyDown(window, { key: 'Enter' })
			expect(onAddPuzzle).toHaveBeenCalledOnce()

			// Advance past correction flash if answer was wrong
			await vi.advanceTimersByTimeAsync(
				AppSettings.correctionWrongDuration + 100
			)

			await fireEvent.keyDown(window, { key: '2' })
			await fireEvent.keyDown(window, { key: 'Enter' })
			expect(onAddPuzzle).toHaveBeenCalledTimes(2)
		})

		it('includes duration field in submitted puzzle', async () => {
			const onAddPuzzle = vi.fn()
			renderPuzzle({ onAddPuzzle })

			await fireEvent.keyDown(window, { key: '5' })
			await fireEvent.keyDown(window, { key: 'Enter' })

			const puzzle = onAddPuzzle.mock.calls[0]![0]
			expect(puzzle).toHaveProperty('duration')
		})
	})

	describe('puzzle generation', () => {
		beforeEach(() => vi.useFakeTimers())
		afterEach(() => vi.useRealTimers())

		it('generates unique puzzles from recent history', async () => {
			const puzzles: unknown[] = []
			const onAddPuzzle = vi.fn((p: unknown) => puzzles.push(p))
			renderPuzzle({ onAddPuzzle })

			// Submit several puzzles
			for (let i = 0; i < 5; i++) {
				await fireEvent.keyDown(window, { key: String(i + 1) })
				await fireEvent.keyDown(window, { key: 'Enter' })
				await vi.advanceTimersByTimeAsync(
					AppSettings.correctionWrongDuration + 100
				)
			}

			expect(puzzles).toHaveLength(5)
			// Each puzzle should have the selected operator
			for (const p of puzzles) {
				expect(p).toHaveProperty('operator', Operator.Addition)
			}
		})
	})

	describe('countdown to quiz start', () => {
		beforeEach(() => vi.useFakeTimers())
		afterEach(() => vi.useRealTimers())

		it('shows countdown text when quiz is AboutToStart', () => {
			const { getByTestId } = render(PuzzleComponent, {
				props: {
					quiz: createQuiz({ state: QuizState.AboutToStart }),
					seconds: 0
				},
				context: puzzleContext
			})
			const expression = getByTestId('puzzle-expression')
			expect(expression.textContent).toMatch(/Ready|Set|Go!/)
		})

		it('calls startQuiz context function after countdown finishes', async () => {
			const startQuiz = vi.fn()
			const context = new Map<string, () => void>([
				['startQuiz', startQuiz],
				['abortQuiz', () => {}],
				['completeQuiz', () => {}]
			])
			render(PuzzleComponent, {
				props: {
					quiz: createQuiz({ state: QuizState.AboutToStart }),
					seconds: 0
				},
				context
			})

			await vi.advanceTimersByTimeAsync(5000)

			expect(startQuiz).toHaveBeenCalledOnce()
		})
	})

	describe('quiz timeout', () => {
		beforeEach(() => vi.useFakeTimers())
		afterEach(() => vi.useRealTimers())

		it('calls onQuizTimeout when timed quiz expires', async () => {
			const onQuizTimeout = vi.fn()
			const { rerender } = render(PuzzleComponent, {
				props: {
					quiz: createQuiz({ state: QuizState.AboutToStart }),
					seconds: 2,
					onQuizTimeout
				},
				context: puzzleContext
			})

			// Advance past the countdown (1s in DEV) + transition duration
			await vi.advanceTimersByTimeAsync(1500)

			// Simulate the context's startQuiz updating quiz state
			await rerender({
				quiz: createQuiz({ state: QuizState.Started }),
				seconds: 2,
				onQuizTimeout
			})

			// Advance past the quiz timer (2s)
			await vi.advanceTimersByTimeAsync(3000)

			expect(onQuizTimeout).toHaveBeenCalledOnce()
		})
	})

	describe('replay mode', () => {
		function createReplayPuzzle(a: number, b: number): Puzzle {
			return {
				parts: [
					{ generatedValue: a, userDefinedValue: undefined },
					{ generatedValue: b, userDefinedValue: undefined },
					{ generatedValue: a + b, userDefinedValue: undefined }
				],
				duration: 1,
				isCorrect: true,
				operator: Operator.Addition,
				unknownPartIndex: 2
			}
		}

		it('uses replay puzzles instead of generating new ones', () => {
			const replayPuzzles = [createReplayPuzzle(3, 4), createReplayPuzzle(7, 8)]
			const { getByTestId } = render(PuzzleComponent, {
				props: {
					quiz: createQuiz({ replayPuzzles }),
					seconds: 0
				},
				context: puzzleContext
			})

			// data-puzzle-expression has raw values (bypasses tween animation)
			const form = getByTestId('puzzle-expression').closest('form')!
			expect(form.getAttribute('data-puzzle-expression')).toBe('3+4=?')
		})

		it('calls onQuizTimeout after all replay puzzles are answered', async () => {
			const replayPuzzles = [createReplayPuzzle(3, 4)]
			const onQuizTimeout = vi.fn()
			render(PuzzleComponent, {
				props: {
					quiz: createQuiz({ replayPuzzles }),
					seconds: 0,
					onQuizTimeout
				},
				context: puzzleContext
			})

			// Answer the single replay puzzle with the correct answer (7)
			await fireEvent.keyDown(window, { key: '7' })
			await fireEvent.keyDown(window, { key: 'Enter' })

			expect(onQuizTimeout).toHaveBeenCalledOnce()
		})
	})

	describe('adaptive skill updates', () => {
		beforeEach(() => vi.useFakeTimers())
		afterEach(() => vi.useRealTimers())

		function createReplayPuzzleForAdaptive(a: number, b: number): Puzzle {
			return {
				parts: [
					{ generatedValue: a, userDefinedValue: undefined },
					{ generatedValue: b, userDefinedValue: undefined },
					{ generatedValue: a + b, userDefinedValue: undefined }
				],
				duration: 1,
				isCorrect: true,
				operator: Operator.Addition,
				unknownPartIndex: 2
			}
		}

		it('calls applySkillUpdate on puzzle submission', async () => {
			renderPuzzle()

			await fireEvent.keyDown(window, { key: '5' })
			await fireEvent.keyDown(window, { key: 'Enter' })

			expect(mockApplySkillUpdate).toHaveBeenCalledOnce()
			const [
				skillMap,
				operator,
				parts,
				isCorrect,
				duration,
				consecutiveCorrect
			] = mockApplySkillUpdate.mock.calls[0]!
			expect(skillMap).toEqual([0, 0, 0, 0])
			expect(operator).toBe(Operator.Addition)
			expect(parts).toHaveLength(3)
			expect(typeof isCorrect).toBe('boolean')
			expect(typeof duration).toBe('number')
			expect(typeof consecutiveCorrect).toBe('number')
		})

		it('resets consecutive correct count after a wrong answer', async () => {
			// Use replay puzzles for deterministic answers: 2+3=5, 1+1=2, 10+10=20
			const replayPuzzles = [
				createReplayPuzzleForAdaptive(2, 3),
				createReplayPuzzleForAdaptive(1, 1),
				createReplayPuzzleForAdaptive(10, 10)
			]
			render(PuzzleComponent, {
				props: {
					quiz: createQuiz({ replayPuzzles }),
					seconds: 0
				},
				context: puzzleContext
			})

			// Puzzle 1: correct answer (5) → consecutiveCorrect becomes 1
			await fireEvent.keyDown(window, { key: '5' })
			await fireEvent.keyDown(window, { key: 'Enter' })
			expect(mockApplySkillUpdate.mock.calls[0]![5]).toBe(1)

			await vi.advanceTimersByTimeAsync(
				AppSettings.correctionWrongDuration + 100
			)

			// Puzzle 2: wrong answer (9) → consecutiveCorrect resets to 0
			await fireEvent.keyDown(window, { key: '9' })
			await fireEvent.keyDown(window, { key: 'Enter' })
			expect(mockApplySkillUpdate.mock.calls[1]![3]).toBe(false)
			expect(mockApplySkillUpdate.mock.calls[1]![5]).toBe(0)

			// Advance past correction flash for wrong answer
			await vi.advanceTimersByTimeAsync(
				AppSettings.correctionWrongDuration + 100
			)

			// Puzzle 3: correct answer (20) → consecutiveCorrect is 1 again (not carried from before)
			await fireEvent.keyDown(window, { key: '2' })
			await fireEvent.keyDown(window, { key: '0' })
			await fireEvent.keyDown(window, { key: 'Enter' })
			expect(mockApplySkillUpdate.mock.calls[2]![3]).toBe(true)
			expect(mockApplySkillUpdate.mock.calls[2]![5]).toBe(1)
		})
	})

	describe('validation error display', () => {
		it('shows error state on next button when submitting negative zero', async () => {
			const { getByTestId } = renderPuzzle()

			// Type minus (creates -0 value) then try to submit
			await fireEvent.keyDown(window, { key: '-' })
			await fireEvent.keyDown(window, { key: 'Enter' })

			// displayError becomes true → NumpadComponent receives disabledNext=true
			const nextButton = getByTestId('numpad-next')
			expect(nextButton).toHaveProperty('disabled', true)
		})
	})
})
