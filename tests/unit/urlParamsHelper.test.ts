import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getQuiz } from '$lib/helpers/quizHelper'
import { Operator } from '$lib/constants/Operator'
import { PuzzleMode } from '$lib/constants/PuzzleMode'

vi.mock('$app/navigation', () => ({
	replaceState: vi.fn()
}))

import { replaceState } from '$app/navigation'
import { setUrlParams, buildShareUrl } from '$lib/helpers/urlParamsHelper'

import { adaptiveDifficultyId } from '$lib/models/AdaptiveProfile'

describe('urlParamsHelper', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.useFakeTimers()
		;(globalThis as { window?: Window & typeof globalThis }).window =
			globalThis as Window & typeof globalThis
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('writes expected query params to URL', async () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.duration = 2
		quiz.hidePuzzleProgressBar = false
		quiz.selectedOperator = Operator.Division
		quiz.puzzleMode = PuzzleMode.Random
		quiz.allowNegativeAnswers = true

		setUrlParams(quiz)
		await vi.runOnlyPendingTimersAsync()

		expect(replaceState).toHaveBeenCalledTimes(1)
		const url = vi.mocked(replaceState).mock.calls[0]?.[0] as string
		if (!url) throw new Error('replaceState was not called')
		const params = new URLSearchParams(url.startsWith('?') ? url.slice(1) : url)

		expect(params.get('duration')).toBe('2')
		expect(params.get('hideProgressBar')).toBe('false')
		expect(params.get('operator')).toBe('3')
		expect(params.get('puzzleMode')).toBe('2')
		expect(params.get('allowNegativeAnswers')).toBe('true')
		expect(params.get('mulValues')).toBe('7')
		expect(params.get('divValues')).toBe('5')
	})

	it('does not throw when replaceState is called', async () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))

		setUrlParams(quiz)
		await vi.runOnlyPendingTimersAsync()

		expect(replaceState).toHaveBeenCalledTimes(1)
	})

	it('serializes optional fields as empty strings when undefined', async () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = undefined
		quiz.difficulty = undefined

		setUrlParams(quiz)
		await vi.runOnlyPendingTimersAsync()

		const url = vi.mocked(replaceState).mock.calls[0]?.[0] as string
		if (!url) throw new Error('replaceState was not called')
		const params = new URLSearchParams(url.startsWith('?') ? url.slice(1) : url)

		expect(params.get('operator')).toBe('')
		expect(params.get('difficulty')).toBe('')
	})

	it('debounces rapid calls and applies only the last one', async () => {
		const quiz1 = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz1.duration = 1
		const quiz2 = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz2.duration = 5

		setUrlParams(quiz1)
		setUrlParams(quiz2)
		await vi.runOnlyPendingTimersAsync()

		expect(replaceState).toHaveBeenCalledTimes(1)
		const url = vi.mocked(replaceState).mock.calls[0]?.[0] as string
		if (!url) throw new Error('replaceState was not called')
		const params = new URLSearchParams(url.startsWith('?') ? url.slice(1) : url)
		expect(params.get('duration')).toBe('5')
	})

	it('clears previous pending timeout when called again', async () => {
		const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')

		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		setUrlParams(quiz)
		setUrlParams(quiz)

		expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(0)

		await vi.runOnlyPendingTimersAsync()
	})

	it('keeps allowNegativeAnswers=false when adaptive mode is parsed from URL params', async () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=0'))
		quiz.difficulty = adaptiveDifficultyId
		quiz.allowNegativeAnswers = false

		setUrlParams(quiz)
		await vi.runOnlyPendingTimersAsync()

		const url = vi.mocked(replaceState).mock.calls[0]?.[0] as string
		if (!url) throw new Error('replaceState was not called')
		const params = new URLSearchParams(url.startsWith('?') ? url.slice(1) : url)

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

	it('round-trips unlimited duration (0) through URL params', async () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.duration = 0

		setUrlParams(quiz)
		await vi.runOnlyPendingTimersAsync()

		const url = vi.mocked(replaceState).mock.calls[0]?.[0] as string
		if (!url) throw new Error('replaceState was not called')
		const params = new URLSearchParams(url.startsWith('?') ? url.slice(1) : url)

		expect(params.get('duration')).toBe('0')

		const parsed = getQuiz(params)
		expect(parsed.duration).toBe(0)
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
