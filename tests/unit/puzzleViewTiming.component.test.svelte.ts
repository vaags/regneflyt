// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/svelte'
import PuzzleView from './harnesses/PuzzleViewDockHarness.svelte'
import { createTestQuiz } from './component-setup'
import { QuizState } from '#lib/domain/quiz/quizState.ts'
import { AppSettings } from '#lib/constants/AppSettings.ts'
import type { Puzzle } from '#lib/domain/puzzle-generation/puzzle.ts'
import { persistCompletedQuiz } from '#lib/helpers/quiz/quizResultsHelper.ts'
import { parseLastResultsSnapshot } from '#lib/models/persistedStoreSchemas.ts'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
	cleanup()
	vi.useRealTimers()
})

it('accepts attempts only after each puzzle starts timing and preserves replayable results', async () => {
	const quiz = createTestQuiz({
		state: QuizState.AboutToStart,
		skillByOperator: [40, 40, 40, 40]
	})
	const attempts: Puzzle[] = []
	const { getByTestId } = render(PuzzleView, {
		props: {
			quiz,
			seconds: 0,
			onAddPuzzle: (puzzle: Puzzle) => attempts.push(puzzle)
		}
	})
	const answer = getByTestId('puzzle-answer-value')
	const form = answer.closest('form')
	if (!form) throw new Error('Missing answer form')
	const numpad = getByTestId('numpad-1').closest('fieldset')

	await fireEvent.submit(form)
	expect(attempts).toHaveLength(0)
	expect(numpad).toHaveProperty('disabled', true)

	await vi.advanceTimersByTimeAsync(AppSettings.separatorPageDuration * 1000)
	expect(answer).toHaveProperty('readOnly', true)
	await fireEvent.input(answer, { target: { value: '999' } })
	await fireEvent.submit(form)
	expect(attempts).toHaveLength(0)

	await vi.advanceTimersByTimeAsync(AppSettings.transitionDuration.duration)
	expect(answer).toHaveProperty('readOnly', false)
	expect(numpad).toHaveProperty('disabled', false)
	await vi.advanceTimersByTimeAsync(500)
	await fireEvent.input(answer, { target: { value: '999' } })
	await fireEvent.keyDown(answer, { key: 'Enter' })
	expect(attempts).toHaveLength(1)
	expect(attempts[0]?.duration).toBeCloseTo(0.5)
	expect(quiz.skillByOperator[0]).toBeGreaterThan(0)

	await vi.advanceTimersByTimeAsync(AppSettings.correctionWrongDuration)
	expect(answer).toHaveProperty('readOnly', true)
	expect(numpad).toHaveProperty('disabled', true)
	await fireEvent.submit(form)
	expect(attempts).toHaveLength(1)

	await vi.advanceTimersByTimeAsync(AppSettings.transitionDuration.duration)
	await vi.advanceTimersByTimeAsync(500)
	await fireEvent.input(answer, { target: { value: '999' } })
	await fireEvent.keyDown(answer, { key: 'Enter' })
	expect(attempts).toHaveLength(2)
	expect(attempts[1]?.duration).toBeCloseTo(0.5)

	const setOperatorSkills = vi.fn()
	const setLastResults = vi.fn()
	const results = persistCompletedQuiz(quiz, attempts, [40, 40, 40, 40], {
		setOperatorSkills,
		setLastResults
	})
	const serialized: unknown = JSON.parse(JSON.stringify(results))
	expect(parseLastResultsSnapshot(serialized)?.puzzleSet).toHaveLength(2)
	expect(setOperatorSkills).toHaveBeenCalledWith(quiz.skillByOperator)
	expect(setLastResults).toHaveBeenCalledWith(results)
	expect(quiz.skillByOperator[0]).toBeGreaterThan(0)
})

it('starts a fresh timer after a correct answer and ignores wall clock changes', async () => {
	const quiz = createTestQuiz()
	quiz.operatorSettings[0].range = [1, 1]
	const attempts: Puzzle[] = []
	const { getByTestId } = render(PuzzleView, {
		props: {
			quiz,
			seconds: 0,
			onAddPuzzle: (puzzle: Puzzle) => attempts.push(puzzle)
		}
	})
	const answer = getByTestId('puzzle-answer-value')
	const form = answer.closest('form')
	if (!form) throw new Error('Missing answer form')

	await vi.advanceTimersByTimeAsync(500)
	await fireEvent.input(answer, { target: { value: '2' } })
	await fireEvent.keyDown(answer, { key: 'Enter' })
	expect(attempts[0]?.isCorrect).toBe(true)
	expect(answer).toHaveProperty('readOnly', true)
	await fireEvent.input(answer, { target: { value: '999' } })
	await fireEvent.submit(form)
	expect(attempts).toHaveLength(1)

	await vi.advanceTimersByTimeAsync(AppSettings.transitionDuration.duration)
	vi.setSystemTime(Date.now() - 60_000)
	await vi.advanceTimersByTimeAsync(500)
	await fireEvent.input(answer, { target: { value: '999' } })
	await fireEvent.keyDown(answer, { key: 'Enter' })
	expect(attempts).toHaveLength(2)
	expect(attempts[1]?.duration).toBeCloseTo(0.5)
})

it.each([true, false])(
	'restores keypad focus only when the user has not moved elsewhere (moved: %s)',
	async (moveFocus) => {
		const quiz = createTestQuiz()
		quiz.operatorSettings[0].range = [1, 1]
		const { getByTestId } = render(PuzzleView, {
			props: { quiz, seconds: 0 }
		})
		await fireEvent.input(getByTestId('puzzle-answer-value'), {
			target: { value: '2' }
		})
		const next = getByTestId('numpad-next')
		next.focus()
		await fireEvent.keyDown(next, { key: 'Enter' })
		await fireEvent.click(next)
		const menu = getByTestId('btn-menu')
		if (moveFocus) {
			menu.focus()
		} else {
			// Browsers may move focus to the document when a focused button is disabled.
			next.blur()
		}

		await vi.advanceTimersByTimeAsync(AppSettings.transitionDuration.duration)

		expect(document.activeElement).toBe(moveFocus ? menu : next)
	}
)
