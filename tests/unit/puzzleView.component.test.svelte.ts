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
import { activeToast, dismissToast, showToast } from '$lib/stores'

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
		alert_enter_answer: () => 'Enter an answer before continuing.',
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

async function enterAnswer(
	getByTestId: (testId: string) => HTMLElement,
	value: string
) {
	await fireEvent.input(getByTestId('puzzle-answer-value'), {
		target: { value }
	})
}

async function submitAnswerInput(getByTestId: (testId: string) => HTMLElement) {
	await fireEvent.keyDown(getByTestId('puzzle-answer-value'), { key: 'Enter' })
}

describe('PuzzleView', () => {
	afterEach(() => {
		cleanup()
		dismissToast()
		vi.clearAllMocks()
	})

	describe('answer submission', () => {
		it('shows ? for an unfocused unknown part and hides it while focused', () => {
			const { getByTestId } = renderPuzzle()
			const answer = getByTestId('puzzle-answer-value')

			expect(answer).toHaveProperty('placeholder', '?')
			expect(
				answer.classList.contains('focus:placeholder:text-transparent')
			).toBe(true)
		})

		it('updates display when typing a digit', async () => {
			const { getByTestId } = renderPuzzle()
			await enterAnswer(getByTestId, '5')
			expect(getByTestId('puzzle-answer-value')).toHaveProperty('value', '5')
		})

		it('calls onAddPuzzle with puzzle structure on submission', async () => {
			const onAddPuzzle = vi.fn()
			const { getByTestId } = renderPuzzle({ onAddPuzzle })

			await enterAnswer(getByTestId, '1')
			await submitAnswerInput(getByTestId)

			expect(onAddPuzzle).toHaveBeenCalledOnce()
			const puzzle = onAddPuzzle.mock.calls[0]![0] as Puzzle
			expect(puzzle).toHaveProperty('operator')
			expect(puzzle).toHaveProperty('parts')
			expect(puzzle).toHaveProperty('isCorrect')
			expect(typeof puzzle.isCorrect).toBe('boolean')
		})

		it('processes synchronous duplicate Enter presses only once', async () => {
			const onAddPuzzle = vi.fn()
			const { getByTestId } = renderPuzzle({ onAddPuzzle })
			await enterAnswer(getByTestId, '1')
			const answer = getByTestId('puzzle-answer-value')
			answer.dispatchEvent(
				new KeyboardEvent('keydown', {
					key: 'Enter',
					bubbles: true,
					cancelable: true
				})
			)
			answer.dispatchEvent(
				new KeyboardEvent('keydown', {
					key: 'Enter',
					bubbles: true,
					cancelable: true
				})
			)
			await vi.waitFor(() => {
				expect(onAddPuzzle).toHaveBeenCalledOnce()
			})

			expect(mockApplySkillUpdate).toHaveBeenCalledOnce()
		})

		it('marks incorrect answer as wrong', async () => {
			const onAddPuzzle = vi.fn()
			const { getByTestId } = renderPuzzle({ onAddPuzzle })

			// Derived from the generated puzzle: a fixed guess is only wrong for as
			// long as it stays outside whatever range the operands are drawn from.
			// Summing is only the right derivation for addition, so assert that too.
			const expression = getByTestId('puzzle-expression').textContent
			expect(expression).toContain('+')
			const operands = (expression.match(/\d+/g) ?? []).map(Number)
			expect(operands).toHaveLength(2)
			const wrongAnswer = String(operands.reduce((sum, n) => sum + n, 0) + 1)

			await enterAnswer(getByTestId, wrongAnswer)
			await submitAnswerInput(getByTestId)

			expect(onAddPuzzle).toHaveBeenCalledOnce()
			const puzzle = onAddPuzzle.mock.calls[0]![0] as Puzzle
			expect(puzzle.isCorrect).toBe(false)
		})

		it('shows persistent toast feedback and describes empty answer input without submitting', async () => {
			const onAddPuzzle = vi.fn()
			const { getByTestId, getByRole } = renderPuzzle({ onAddPuzzle })

			await submitAnswerInput(getByTestId)

			expect(onAddPuzzle).not.toHaveBeenCalled()
			const validationMessage = getByTestId('puzzle-answer-validation')
			expect(validationMessage.textContent).toContain(
				'Enter an answer before continuing.'
			)
			expect(validationMessage.getAttribute('aria-live')).toBeNull()
			expect(validationMessage.getAttribute('role')).toBeNull()
			expect(activeToast.current).toMatchObject({
				message: 'Enter an answer before continuing.',
				variant: 'error',
				testId: 'puzzle-answer-validation-toast',
				autoDismissMs: null
			})
			const numpadGroup = getByRole('group', { name: 'Number pad' })
			expect(numpadGroup.getAttribute('aria-describedby')).toBe(
				validationMessage.id
			)
		})

		it('does not submit negative zero as a value', async () => {
			const onAddPuzzle = vi.fn()
			const { getByTestId } = renderPuzzle({ onAddPuzzle })

			const answer = getByTestId('puzzle-answer-value')
			await fireEvent.keyDown(answer, { key: '-' })
			expect(answer).toHaveProperty('value', '')
			expect(answer).toHaveProperty('placeholder', '-')
			expect(
				answer.classList.contains('focus:placeholder:text-transparent')
			).toBe(false)
			await submitAnswerInput(getByTestId)

			expect(onAddPuzzle).not.toHaveBeenCalled()
		})

		it('applies a pending minus to the next entered digit', async () => {
			const { getByTestId } = renderPuzzle()
			const answer = getByTestId('puzzle-answer-value')

			await fireEvent.keyDown(answer, { key: '-' })
			await fireEvent.input(answer, { target: { value: '5' } })

			expect(answer).toHaveProperty('value', '-5')
		})

		it('accepts three-digit answers and rejects four-digit answers', async () => {
			const { getByTestId } = renderPuzzle()
			const answer = getByTestId('puzzle-answer-value')

			await fireEvent.input(answer, { target: { value: '999' } })
			expect(answer).toHaveProperty('value', '999')
			await fireEvent.input(answer, { target: { value: '1000' } })
			expect(answer).toHaveProperty('value', '999')

			await fireEvent.input(answer, { target: { value: '-999' } })
			expect(answer).toHaveProperty('value', '-999')
			await fireEvent.input(answer, { target: { value: '-1000' } })
			expect(answer).toHaveProperty('value', '-999')
		})
	})

	describe('puzzle progression', () => {
		beforeEach(() => vi.useFakeTimers())
		afterEach(() => vi.useRealTimers())

		it('advances to the next puzzle after submission', async () => {
			const onAddPuzzle = vi.fn()
			const { getByTestId } = renderPuzzle({ onAddPuzzle })

			await enterAnswer(getByTestId, '1')
			await submitAnswerInput(getByTestId)
			expect(onAddPuzzle).toHaveBeenCalledOnce()

			// Advance past correction flash if answer was wrong
			await vi.advanceTimersByTimeAsync(
				AppSettings.correctionWrongDuration + 100
			)

			await enterAnswer(getByTestId, '2')
			await submitAnswerInput(getByTestId)
			expect(onAddPuzzle).toHaveBeenCalledTimes(2)
		})

		it('re-announces the incorrect label on a second wrong answer in a row', async () => {
			const { getByTestId } = renderPuzzle()
			const announcer = getByTestId('puzzle-incorrect-announcer')

			const answerWrong = async () => {
				await enterAnswer(getByTestId, '999')
				await submitAnswerInput(getByTestId)
				await vi.advanceTimersByTimeAsync(0)
			}

			await answerWrong()
			expect(announcer.textContent.trim()).toBe('Incorrect')

			// An identical repeat is silent unless the region empties in between.
			await vi.advanceTimersByTimeAsync(
				AppSettings.correctionWrongDuration + 100
			)
			expect(announcer.textContent.trim()).toBe('')

			await answerWrong()
			expect(announcer.textContent.trim()).toBe('Incorrect')
		})

		it('includes duration field in submitted puzzle', async () => {
			const onAddPuzzle = vi.fn()
			const { getByTestId } = renderPuzzle({ onAddPuzzle })

			await enterAnswer(getByTestId, '5')
			await submitAnswerInput(getByTestId)

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
			const { getByTestId } = renderPuzzle({ onAddPuzzle })

			// Submit several puzzles
			for (let i = 0; i < 5; i++) {
				const digitButton = getByTestId('numpad-9')
				const nextButton = getByTestId('numpad-next')
				await vi.waitFor(() => {
					expect(digitButton).toHaveProperty('disabled', false)
				})
				// Keep every result on the same asynchronous correction path. Mixing
				// accidental correct answers with wrong answers makes fake-timer
				// synchronization depend on the generated arithmetic.
				for (let digit = 0; digit < 4; digit++) {
					await fireEvent.click(digitButton)
				}
				await vi.waitFor(() => {
					expect(nextButton).toHaveProperty('disabled', false)
				})
				await fireEvent.click(nextButton)
				await vi.waitFor(() => {
					expect(puzzles).toHaveLength(i + 1)
				})
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

	describe('remaining-time announcement', () => {
		beforeEach(() => vi.useFakeTimers())
		afterEach(() => vi.useRealTimers())

		it('stays silent above the threshold and announces a constant warning below it', async () => {
			const quizSeconds = 9
			const { getByTestId, rerender } = render(PuzzleView, {
				props: {
					quiz: createQuiz({ state: QuizState.AboutToStart }),
					seconds: quizSeconds
				}
			})

			// The quiz timer only starts once the countdown hands over to startQuiz.
			await vi.advanceTimersByTimeAsync(1500)
			await rerender({
				quiz: createQuiz({ state: QuizState.Started }),
				seconds: quizSeconds
			})

			const announcer = getByTestId('quiz-countdown-announcer')
			expect(announcer.textContent.trim()).toBe('')

			// The threshold is 5s remaining, so 5s of a 9s quiz leaves 4s.
			await vi.advanceTimersByTimeAsync(5000)
			const announced = announcer.textContent.trim()
			expect(announced).not.toBe('')

			// The message carries no seconds value, so continued ticking must not
			// re-announce a changed string.
			await vi.advanceTimersByTimeAsync(2000)
			expect(announcer.textContent.trim()).toBe(announced)
		})

		it('stays silent for an unlimited quiz', async () => {
			const { getByTestId, rerender } = render(PuzzleView, {
				props: {
					quiz: createQuiz({ state: QuizState.AboutToStart }),
					seconds: 0
				}
			})

			await vi.advanceTimersByTimeAsync(1500)
			await rerender({
				quiz: createQuiz({ state: QuizState.Started }),
				seconds: 0
			})
			await vi.advanceTimersByTimeAsync(10_000)

			expect(getByTestId('quiz-countdown-announcer').textContent.trim()).toBe(
				''
			)
		})
	})

	describe('adaptive skill updates', () => {
		beforeEach(() => vi.useFakeTimers())
		afterEach(() => vi.useRealTimers())

		it('calls applySkillUpdate on puzzle submission', async () => {
			const { getByTestId } = renderPuzzle()

			await enterAnswer(getByTestId, '5')
			await submitAnswerInput(getByTestId)

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
			const { getByTestId } = renderPuzzle()

			await enterAnswer(getByTestId, '9')
			await submitAnswerInput(getByTestId)

			expect(mockApplySkillUpdate).toHaveBeenCalledOnce()
			expect(mockApplySkillUpdate.mock.calls[0]![3]).toBe(false)
			expect(mockApplySkillUpdate.mock.calls[0]![5]).toBe(0)
		})
	})

	describe('validation error display', () => {
		it.each([
			['Delete', 'numpad-delete'],
			['Minus', 'numpad-minus']
		])(
			'keeps validation associated and blocking after %s leaves the answer missing',
			async (_action, testId) => {
				const { getByTestId, getByRole } = renderPuzzle()

				await submitAnswerInput(getByTestId)
				await fireEvent.click(getByTestId(testId))

				const validationMessage = getByTestId('puzzle-answer-validation')
				const numpadGroup = getByRole('group', { name: 'Number pad' })
				expect(validationMessage.textContent).not.toBe('')
				expect(numpadGroup.getAttribute('aria-describedby')).toBe(
					validationMessage.id
				)
				expect(getByTestId('numpad-next')).toHaveProperty('disabled', true)
				expect(activeToast.current).toMatchObject({
					testId: 'puzzle-answer-validation-toast',
					autoDismissMs: null
				})
			}
		)

		it('shows error state on next button when submitting negative zero', async () => {
			const { getByTestId } = renderPuzzle()

			await fireEvent.keyDown(getByTestId('puzzle-answer-value'), { key: '-' })
			await submitAnswerInput(getByTestId)

			// displayError becomes true → NumpadComponent receives disabledNext=true
			const nextButton = getByTestId('numpad-next')
			expect(nextButton).toHaveProperty('disabled', true)
		})

		it('clears the validation state when the user enters an answer', async () => {
			const { getByTestId } = renderPuzzle()

			await submitAnswerInput(getByTestId)
			expect(getByTestId('puzzle-answer-validation').textContent).not.toBe('')

			await fireEvent.click(getByTestId('numpad-5'))

			const nextButton = getByTestId('numpad-next')
			await vi.waitFor(() => {
				const numpadGroup = nextButton.closest('fieldset')
				expect(numpadGroup?.getAttribute('aria-describedby')).toBeNull()
				expect(nextButton).toHaveProperty('disabled', false)
				expect(activeToast.current).toBeUndefined()
			})
		})

		it('does not dismiss a newer unrelated toast when input clears', async () => {
			const { getByTestId } = renderPuzzle()

			await submitAnswerInput(getByTestId)
			showToast('A newer notification')
			await fireEvent.click(getByTestId('numpad-5'))

			expect(activeToast.current?.message).toBe('A newer notification')
		})

		it('does not treat character keys as quiz input after focus leaves the quiz scope', async () => {
			const { getByTestId } = renderPuzzle()
			const answerInput = getByTestId('puzzle-answer-value')

			getByTestId('btn-menu').focus()
			await fireEvent.keyDown(getByTestId('btn-menu'), { key: '5' })

			expect(answerInput).toHaveProperty('value', '')
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
