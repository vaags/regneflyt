import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getQuiz } from '../../src/helpers/quizHelper'
import { Operator } from '../../src/models/constants/Operator'
import { PuzzleMode } from '../../src/models/constants/PuzzleMode'

vi.mock('$app/navigation', () => ({
	replaceState: vi.fn()
}))

import { replaceState } from '$app/navigation'
import { setUrlParams } from '../../src/helpers/urlParamsHelper'

import { adaptiveDifficultyId } from '../../src/models/AdaptiveProfile'

describe('urlParamsHelper', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		;(globalThis as { window?: Window & typeof globalThis }).window =
			globalThis as Window & typeof globalThis
	})

	it('writes expected query params to URL', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.duration = 2
		quiz.puzzleTimeLimit = true
		quiz.selectedOperator = Operator.Division
		quiz.puzzleMode = PuzzleMode.Random
		quiz.allowNegativeAnswers = true

		setUrlParams(quiz)

		expect(replaceState).toHaveBeenCalledTimes(1)
		const [url] = vi.mocked(replaceState).mock.calls[0]
		const params =
			typeof url === 'string'
				? new URLSearchParams(url.startsWith('?') ? url.slice(1) : url)
				: url.searchParams

		expect(params.get('duration')).toBe('2')
		expect(params.get('timeLimit')).toBe('3')
		expect(params.get('operator')).toBe('3')
		expect(params.get('puzzleMode')).toBe('2')
		expect(params.get('allowNegativeAnswers')).toBe('true')
		expect(params.get('mulValues')).toBe('7')
		expect(params.get('divValues')).toBe('5')
	})

	it('retries replaceState when router is not ready', async () => {
		vi.useFakeTimers()

		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		vi.mocked(replaceState)
			.mockImplementationOnce(() => {
				throw new Error('router not ready')
			})
			.mockImplementationOnce(() => {})

		setUrlParams(quiz)
		expect(replaceState).toHaveBeenCalledTimes(1)

		await vi.runOnlyPendingTimersAsync()
		expect(replaceState).toHaveBeenCalledTimes(2)

		vi.useRealTimers()
	})

	it('serializes optional fields as empty strings when undefined', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = undefined
		quiz.difficulty = undefined

		setUrlParams(quiz)

		const [url] = vi.mocked(replaceState).mock.calls[0]
		const params =
			typeof url === 'string'
				? new URLSearchParams(url.startsWith('?') ? url.slice(1) : url)
				: url.searchParams

		expect(params.get('operator')).toBe('')
		expect(params.get('difficulty')).toBe('')
	})

	it('stops retrying after max retry count', async () => {
		vi.useFakeTimers()
		vi.mocked(replaceState).mockImplementation(() => {
			throw new Error('router not ready')
		})

		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		setUrlParams(quiz)

		await vi.runAllTimersAsync()
		expect(replaceState).toHaveBeenCalledTimes(21)

		vi.useRealTimers()
	})

	it('clears previous retry timeout before starting a new sync', async () => {
		vi.useFakeTimers()
		const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')

		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		vi.mocked(replaceState).mockImplementationOnce(() => {
			throw new Error('router not ready')
		})

		setUrlParams(quiz)
		const callCountAfterFirstSync = clearTimeoutSpy.mock.calls.length
		setUrlParams(quiz)

		expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(
			callCountAfterFirstSync
		)

		await vi.runOnlyPendingTimersAsync()
		vi.useRealTimers()
	})

	it('enforces allowNegativeAnswers=true when adaptive mode is parsed from URL params', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=0'))
		quiz.difficulty = adaptiveDifficultyId
		quiz.allowNegativeAnswers = false

		setUrlParams(quiz)

		const [url] = vi.mocked(replaceState).mock.calls[0]
		const params =
			typeof url === 'string'
				? new URLSearchParams(url.startsWith('?') ? url.slice(1) : url)
				: url.searchParams

		expect(params.get('difficulty')).toBe(adaptiveDifficultyId.toString())
		expect(params.get('allowNegativeAnswers')).toBe('false')

		const parsedQuiz = getQuiz(params)
		expect(parsedQuiz.difficulty).toBe(adaptiveDifficultyId)
		expect(parsedQuiz.allowNegativeAnswers).toBe(true)
	})
})
