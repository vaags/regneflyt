import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getQuiz } from '../../src/helpers/quizHelper'
import { Operator } from '../../src/models/constants/Operator'
import { PuzzleMode } from '../../src/models/constants/PuzzleMode'

vi.mock('$app/navigation', () => ({
	replaceState: vi.fn()
}))

import { replaceState } from '$app/navigation'
import { setUrlParams, buildShareUrl } from '../../src/helpers/urlParamsHelper'

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
		quiz.hidePuzzleProgressBar = false
		quiz.selectedOperator = Operator.Division
		quiz.puzzleMode = PuzzleMode.Random
		quiz.allowNegativeAnswers = true

		setUrlParams(quiz)

		expect(replaceState).toHaveBeenCalledTimes(1)
		const firstCall = vi.mocked(replaceState).mock.calls[0]
		if (!firstCall) throw new Error('replaceState was not called')
		const [url] = firstCall
		const params =
			typeof url === 'string'
				? new URLSearchParams(url.startsWith('?') ? url.slice(1) : url)
				: url.searchParams

		expect(params.get('duration')).toBe('2')
		expect(params.get('hideProgressBar')).toBe('false')
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

		const firstCall = vi.mocked(replaceState).mock.calls[0]
		if (!firstCall) throw new Error('replaceState was not called')
		const [url] = firstCall
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

	it('keeps allowNegativeAnswers=false when adaptive mode is parsed from URL params', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=0'))
		quiz.difficulty = adaptiveDifficultyId
		quiz.allowNegativeAnswers = false

		setUrlParams(quiz)

		const firstCall = vi.mocked(replaceState).mock.calls[0]
		if (!firstCall) throw new Error('replaceState was not called')
		const [url] = firstCall
		const params =
			typeof url === 'string'
				? new URLSearchParams(url.startsWith('?') ? url.slice(1) : url)
				: url.searchParams

		expect(params.get('difficulty')).toBe(adaptiveDifficultyId.toString())
		expect(params.get('allowNegativeAnswers')).toBe('false')

		const parsedQuiz = getQuiz(params)
		expect(parsedQuiz.difficulty).toBe(adaptiveDifficultyId)
		expect(parsedQuiz.allowNegativeAnswers).toBe(false)
	})

	it('throws when operator settings are unexpectedly missing', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		const corruptedQuiz = quiz as unknown as {
			operatorSettings: Array<
				(typeof quiz.operatorSettings)[number] | undefined
			>
		}

		corruptedQuiz.operatorSettings[Operator.Addition] = undefined

		expect(() => setUrlParams(quiz)).toThrow(
			'Cannot sync URL: missing operator settings'
		)
	})
})

describe('buildShareUrl', () => {
	it('adds title and showSettings params to a base URL', () => {
		const result = buildShareUrl('https://example.com/?operator=0', 'My Quiz')
		const url = new URL(result)
		expect(url.searchParams.get('title')).toBe('My Quiz')
		expect(url.searchParams.get('showSettings')).toBe('false')
		expect(url.searchParams.get('operator')).toBe('0')
	})

	it('encodes spaces as %20, not +', () => {
		const result = buildShareUrl('https://example.com/', 'En fin oppgave')
		expect(result).toContain('title=En%20fin%20oppgave')
		expect(result).not.toContain('+')
	})

	it('encodes special characters in the title', () => {
		const result = buildShareUrl('https://example.com/', 'Oppgave #1 & 2')
		const url = new URL(result)
		expect(url.searchParams.get('title')).toBe('Oppgave #1 & 2')
		expect(result).not.toContain('+')
	})

	it('handles an empty title', () => {
		const result = buildShareUrl('https://example.com/?operator=0', '')
		const url = new URL(result)
		expect(url.searchParams.get('title')).toBe('')
		expect(url.searchParams.get('showSettings')).toBe('false')
	})

	it('handles unicode characters in the title', () => {
		const result = buildShareUrl('https://example.com/', 'Oppgåver ÆØÅ')
		const url = new URL(result)
		expect(url.searchParams.get('title')).toBe('Oppgåver ÆØÅ')
	})

	it('overwrites existing title and showSettings params', () => {
		const result = buildShareUrl(
			'https://example.com/?title=Old&showSettings=true&operator=0',
			'New'
		)
		const url = new URL(result)
		expect(url.searchParams.get('title')).toBe('New')
		expect(url.searchParams.get('showSettings')).toBe('false')
		expect(url.searchParams.getAll('title')).toHaveLength(1)
		expect(url.searchParams.getAll('showSettings')).toHaveLength(1)
	})

	it('preserves existing query params', () => {
		const result = buildShareUrl(
			'https://example.com/?operator=0&difficulty=1&duration=2',
			'Test'
		)
		const url = new URL(result)
		expect(url.searchParams.get('operator')).toBe('0')
		expect(url.searchParams.get('difficulty')).toBe('1')
		expect(url.searchParams.get('duration')).toBe('2')
		expect(url.searchParams.get('title')).toBe('Test')
	})

	it('works when the base URL has no query string', () => {
		const result = buildShareUrl('https://example.com/', 'Hello')
		const url = new URL(result)
		expect(url.searchParams.get('title')).toBe('Hello')
		expect(url.searchParams.get('showSettings')).toBe('false')
	})
})
