// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, fireEvent } from '@testing-library/svelte'
import PuzzleView from './harnesses/PuzzleViewDockHarness.svelte'
import { QuizState } from '$lib/constants/QuizState'
import { Operator } from '$lib/constants/Operator'
import type { Quiz } from '$lib/models/Quiz'
import type { Puzzle } from '$lib/models/Puzzle'
import { AppSettings } from '$lib/constants/AppSettings'
import { createTestQuiz } from './component-setup'

// Polyfill element.animate for jsdom (used by Svelte transitions on rerender)
// Polyfill HTMLDialogElement methods for jsdom
if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
	HTMLDialogElement.prototype.showModal = function () {
		this.setAttribute('open', '')
	}
}
if (typeof HTMLDialogElement.prototype.close !== 'function') {
	HTMLDialogElement.prototype.close = function () {
		this.removeAttribute('open')
	}
}

const mockApplySkillUpdate = vi.fn()
vi.mock('$lib/helpers/adaptiveHelper', async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>()
	return {
		...actual,
		applySkillUpdate: (...args: unknown[]): void => {
			mockApplySkillUpdate(...args)
		}
	}
})

vi.mock('$lib/paraglide/messages.js', async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>()

	return {
		...actual,
		getting_ready: () => 'Getting ready',
		puzzle_heading: ({ number }: { number: number }) => `Puzzle ${number}`,
		countdown_go: () => 'Go!',
		countdown_set: () => 'Set',
		countdown_ready: () => 'Ready',
		button_delete: () => 'Delete',
		button_next: () => 'Next',
		button_yes: () => 'Yes',
		button_no: () => 'No',
		button_finish: () => 'Finish',
		button_close: () => 'Close',
		cancel_confirm: () => 'Cancel?',
		cancel_undo: () => 'Cancel',
		complete_confirm: () => 'Finish?',
		complete_confirm_message: () => 'Do you want to finish?',
		quit_confirm_message: () => 'Do you want to quit?',
		sr_progress_bar: () => 'Progress',
		sr_numpad: () => 'Number pad',
		sr_puzzle_input: ({ number }: { number: number }) => `Puzzle ${number}`,
		label_incorrect: () => 'Incorrect',
		label_stars: () => 'Stars'
	}
})

function createQuiz(overrides: Partial<Quiz> = {}): Quiz {
	return createTestQuiz(overrides)
}

type PuzzleCallbacks = {
	onStartQuiz?: () => void
	onAbortQuiz?: () => void
	onCompleteQuiz?: () => void
	onAddPuzzle?: (puzzle: Puzzle) => void
	onQuizTimeout?: () => void
}

function renderPuzzle(props?: PuzzleCallbacks) {
	return render(PuzzleView, {
		props: { quiz: createQuiz(), seconds: 0, ...props }
	})
}

describe('PuzzleView', () => {
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
			const puzzle = onAddPuzzle.mock.calls[0]![0] as Puzzle
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
			const puzzle = onAddPuzzle.mock.calls[0]![0] as Puzzle
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

			const puzzle = onAddPuzzle.mock.calls[0]![0] as Puzzle
			expect(puzzle).toHaveProperty('duration')
		})
	})

	describe('puzzle generation', () => {
		beforeEach(() => vi.useFakeTimers())
		afterEach(() => vi.useRealTimers())

		it('generates unique puzzles from recent history', async () => {
			const puzzles: unknown[] = []
			const onAddPuzzle = vi.fn((p: unknown) => {
				puzzles.push(p)
			})
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
			const { getByTestId } = render(PuzzleView, {
				props: {
					quiz: createQuiz({ state: QuizState.AboutToStart }),
					seconds: 0
				}
			})
			const expression = getByTestId('puzzle-expression')
			expect(expression.textContent).toMatch(/Ready|Set|Go!/)
		})

		it('calls startQuiz callback after countdown finishes', async () => {
			const onStartQuiz = vi.fn()
			render(PuzzleView, {
				props: {
					quiz: createQuiz({ state: QuizState.AboutToStart }),
					seconds: 0,
					onStartQuiz
				}
			})

			await vi.advanceTimersByTimeAsync(5000)

			expect(onStartQuiz).toHaveBeenCalledOnce()
		})
	})

	describe('quiz timeout', () => {
		beforeEach(() => vi.useFakeTimers())
		afterEach(() => vi.useRealTimers())

		it('calls onQuizTimeout when timed quiz expires', async () => {
			const onQuizTimeout = vi.fn()
			const { rerender } = render(PuzzleView, {
				props: {
					quiz: createQuiz({ state: QuizState.AboutToStart }),
					seconds: 2,
					onQuizTimeout
				}
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

	describe('adaptive skill updates', () => {
		beforeEach(() => vi.useFakeTimers())
		afterEach(() => vi.useRealTimers())

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
			] = mockApplySkillUpdate.mock.calls[0]! as unknown[]
			expect(skillMap).toEqual([0, 0, 0, 0])
			expect(operator).toBe(Operator.Addition)
			expect(parts).toHaveLength(3)
			expect(typeof isCorrect).toBe('boolean')
			expect(typeof duration).toBe('number')
			expect(typeof consecutiveCorrect).toBe('number')
		})

		it('resets consecutive correct count after a wrong answer', async () => {
			renderPuzzle()

			await fireEvent.keyDown(window, { key: '9' })
			await fireEvent.keyDown(window, { key: 'Enter' })

			expect(mockApplySkillUpdate).toHaveBeenCalledOnce()
			expect(mockApplySkillUpdate.mock.calls[0]![3]).toBe(false)
			expect(mockApplySkillUpdate.mock.calls[0]![5]).toBe(0)
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

	describe('cancel action', () => {
		it('calls abortQuiz when cancel button is clicked', async () => {
			const onAbortQuiz = vi.fn()
			const { container } = render(PuzzleView, {
				props: { quiz: createQuiz(), seconds: 0, onAbortQuiz }
			})
			const cancelButton = container.querySelector(
				'[data-testid="btn-cancel"]'
			)!
			await fireEvent.click(cancelButton)
			expect(onAbortQuiz).toHaveBeenCalledOnce()
		})
	})

	describe('complete button and dialog', () => {
		it('shows the complete button for unlimited quizzes', () => {
			const { getByTestId } = renderPuzzle()
			expect(getByTestId('btn-complete-quiz')).toBeTruthy()
		})

		it('opens complete dialog when complete button is clicked', async () => {
			const { getByTestId, container } = renderPuzzle()
			await fireEvent.click(getByTestId('btn-complete-quiz'))

			const completeDialog = Array.from(
				container.querySelectorAll('dialog')
			).find((d) => d.querySelector('[data-testid="complete-dialog-heading"]'))!
			expect(completeDialog).toBeTruthy()
			expect(completeDialog.hasAttribute('open')).toBe(true)
		})

		it('shows complete dialog heading', async () => {
			const { getByTestId, container } = renderPuzzle()
			await fireEvent.click(getByTestId('btn-complete-quiz'))

			const completeDialog = Array.from(
				container.querySelectorAll('dialog')
			).find((d) => d.querySelector('[data-testid="complete-dialog-heading"]'))!
			expect(
				completeDialog.querySelector('[data-testid="complete-dialog-heading"]')
					?.textContent
			).toBe('Finish?')
		})

		it('has confirm and dismiss buttons in dialog', async () => {
			const { getByTestId, container } = renderPuzzle()
			await fireEvent.click(getByTestId('btn-complete-quiz'))

			const completeDialog = Array.from(
				container.querySelectorAll('dialog')
			).find((d) => d.querySelector('[data-testid="complete-dialog-heading"]'))!
			expect(
				completeDialog.querySelector('[data-testid="btn-complete-yes"]')
			).toBeTruthy()
			expect(
				completeDialog.querySelector('[data-testid="btn-complete-no"]')
			).toBeTruthy()
		})

		it('calls completeQuiz when confirming Yes', async () => {
			const onCompleteQuiz = vi.fn()
			const { getByTestId, container } = render(PuzzleView, {
				props: { quiz: createQuiz(), seconds: 0, onCompleteQuiz }
			})
			await fireEvent.click(getByTestId('btn-complete-quiz'))

			const completeDialog = Array.from(
				container.querySelectorAll('dialog')
			).find((d) => d.querySelector('[data-testid="complete-dialog-heading"]'))!
			const confirmBtn = completeDialog.querySelector(
				'[data-testid="btn-complete-yes"]'
			)!
			await fireEvent.click(confirmBtn)
			expect(onCompleteQuiz).toHaveBeenCalledOnce()
		})

		it('closes dialog when No is clicked', async () => {
			const { getByTestId, container } = renderPuzzle()
			await fireEvent.click(getByTestId('btn-complete-quiz'))

			let completeDialog = Array.from(
				container.querySelectorAll('dialog')
			).find((d) => d.querySelector('[data-testid="complete-dialog-heading"]'))!
			expect(completeDialog.hasAttribute('open')).toBe(true)

			const dismissBtn = completeDialog.querySelector(
				'[data-testid="btn-complete-no"]'
			)!
			await fireEvent.click(dismissBtn)

			// Wait for the close animation to complete
			await new Promise((r) => {
				setTimeout(r, AppSettings.transitionDuration.duration + 10)
			})

			completeDialog = Array.from(container.querySelectorAll('dialog')).find(
				(d) => d.querySelector('[data-testid="complete-dialog-heading"]')
			)!
			expect(completeDialog.hasAttribute('open')).toBe(false)
		})
	})
})
