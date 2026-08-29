import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getQuiz } from '#lib/helpers/quiz/quizHelper.ts'
import { Operator } from '#lib/constants/Operator.ts'
import { PuzzleMode } from '#lib/constants/PuzzleMode.ts'

vi.mock('$app/navigation', () => ({
	goto: vi.fn(() => Promise.resolve())
}))

import { goto } from '$app/navigation'
import {
	buildCopyLinkUrl,
	buildPathWithQuizQueryParams,
	cancelPendingQuizUrlSync,
	setUrlSyncRuntimeForTests,
	syncQuizUrlParams,
	type UrlSyncRuntime
} from '#lib/helpers/urlParamsHelper.ts'

import { adaptiveDifficultyId } from '#lib/models/AdaptiveProfile.ts'

describe('urlParamsHelper', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.useFakeTimers()
		const globalScope = globalThis as { window?: Window & typeof globalThis }
		globalScope.window = globalThis as Window & typeof globalThis
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	function getCapturedParams(): URLSearchParams {
		const url = vi.mocked(goto).mock.calls[0]?.[0] as string
		if (!url) throw new Error('goto was not called')
		return new URLSearchParams(url.startsWith('?') ? url.slice(1) : url)
	}

	it('writes expected query params to URL', async () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.duration = 2
		quiz.showPuzzleProgressBar = true
		quiz.selectedOperator = Operator.Division
		quiz.puzzleMode = PuzzleMode.Random
		quiz.allowNegativeAnswers = true

		syncQuizUrlParams(quiz)
		await vi.runOnlyPendingTimersAsync()

		expect(goto).toHaveBeenCalledWith(expect.any(String), {
			shallow: true,
			replace: true
		})
		const params = getCapturedParams()

		expect(params.get('duration')).toBe('2')
		expect(params.get('showProgressBar')).toBe('true')
		expect(params.get('operator')).toBe('3')
		expect(params.get('puzzleMode')).toBe('2')
		expect(params.get('allowNegativeAnswers')).toBe('true')
		expect(params.get('mulValues')).toBe('7')
		expect(params.get('divValues')).toBe('5')
	})

	it('does not throw when shallow URL replacement is called', async () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))

		syncQuizUrlParams(quiz)
		await vi.runOnlyPendingTimersAsync()

		expect(goto).toHaveBeenCalledTimes(1)
	})

	it('syncs updated duration through URL params', async () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.duration = 3

		syncQuizUrlParams(quiz)
		await vi.runOnlyPendingTimersAsync()

		expect(goto).toHaveBeenCalledTimes(1)
		const params = getCapturedParams()
		expect(params.get('duration')).toBe('3')
	})

	it('serializes optional fields as empty strings when undefined', async () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = undefined
		quiz.difficulty = undefined

		syncQuizUrlParams(quiz)
		await vi.runOnlyPendingTimersAsync()

		const params = getCapturedParams()

		expect(params.get('operator')).toBe('')
		expect(params.get('difficulty')).toBe('')
	})

	it('debounces rapid calls and applies only the last one', async () => {
		const quiz1 = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz1.duration = 1
		const quiz2 = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz2.duration = 5

		syncQuizUrlParams(quiz1)
		syncQuizUrlParams(quiz2)
		await vi.runOnlyPendingTimersAsync()

		expect(goto).toHaveBeenCalledTimes(1)
		const params = getCapturedParams()
		expect(params.get('duration')).toBe('5')
	})

	it('cancels a pending URL replacement before quiz navigation', async () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))

		syncQuizUrlParams(quiz)
		cancelPendingQuizUrlSync()
		await vi.runOnlyPendingTimersAsync()

		expect(goto).not.toHaveBeenCalled()
	})

	it('clears previous pending timeout when called again', async () => {
		const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')

		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		syncQuizUrlParams(quiz)
		syncQuizUrlParams(quiz)

		expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(0)

		await vi.runOnlyPendingTimersAsync()
	})

	it('keeps allowNegativeAnswers=false when adaptive mode is parsed from URL params', async () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=0'))
		quiz.difficulty = adaptiveDifficultyId
		quiz.allowNegativeAnswers = false

		syncQuizUrlParams(quiz)
		await vi.runOnlyPendingTimersAsync()

		const params = getCapturedParams()

		expect(params.get('difficulty')).toBe(adaptiveDifficultyId.toString())
		expect(params.get('allowNegativeAnswers')).toBe('false')

		const parsedQuiz = getQuiz(params)
		expect(parsedQuiz.difficulty).toBe(adaptiveDifficultyId)
		expect(parsedQuiz.allowNegativeAnswers).toBe(false)
	})

	it('round-trips unlimited duration (0) through URL params', async () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.duration = 0

		syncQuizUrlParams(quiz)
		await vi.runOnlyPendingTimersAsync()

		const params = getCapturedParams()

		expect(params.get('duration')).toBe('0')

		const parsed = getQuiz(params)
		expect(parsed.duration).toBe(0)
	})

	it('supports injected runtime adapter without touching window APIs', async () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		const calls: string[] = []

		const testRuntime: UrlSyncRuntime = {
			clearTimeout: () => {},
			setTimeout: (callback, _timeoutMs) => {
				callback()
				return 0
			},
			replaceUrl: () => {
				calls.push('replaceUrl')
				return Promise.resolve()
			}
		}

		const restoreRuntime = setUrlSyncRuntimeForTests(testRuntime)

		try {
			syncQuizUrlParams(quiz)
			await Promise.resolve()

			expect(calls).toEqual(['replaceUrl'])
		} finally {
			restoreRuntime()
		}
	})

	it('keeps a newer debounce timer when an earlier navigation rejects', async () => {
		const callbacks = new Map<number, () => void>()
		const clearTimeout = vi.fn((timeoutId) => {
			callbacks.delete(timeoutId as number)
		})
		let nextTimeoutId = 0
		let rejectFirstNavigation: ((reason?: unknown) => void) | undefined
		const replaceUrl = vi.fn(() => {
			if (replaceUrl.mock.calls.length === 1) {
				return new Promise<void>((_resolve, reject) => {
					rejectFirstNavigation = reject
				})
			}
			return Promise.resolve()
		})
		const restoreRuntime = setUrlSyncRuntimeForTests({
			clearTimeout,
			setTimeout: (callback, _timeoutMs) => {
				const timeoutId = ++nextTimeoutId
				callbacks.set(timeoutId, callback)
				return timeoutId
			},
			replaceUrl
		})
		const firstQuiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		firstQuiz.duration = 1
		const secondQuiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		secondQuiz.duration = 2
		const thirdQuiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		thirdQuiz.duration = 3

		try {
			syncQuizUrlParams(firstQuiz)
			callbacks.get(1)?.()
			expect(replaceUrl).toHaveBeenCalledTimes(1)

			syncQuizUrlParams(secondQuiz)
			rejectFirstNavigation?.(new Error('navigation cancelled'))
			await Promise.resolve()
			await Promise.resolve()

			syncQuizUrlParams(thirdQuiz)
			expect(clearTimeout).toHaveBeenCalledWith(2)
			expect(callbacks.has(2)).toBe(false)

			callbacks.get(3)?.()

			expect(replaceUrl).toHaveBeenCalledTimes(2)
		} finally {
			restoreRuntime()
		}
	})
})

describe('buildCopyLinkUrl', () => {
	it('keeps existing query params', () => {
		const result = buildCopyLinkUrl(
			'https://example.com/?operator=0&difficulty=1'
		)
		const url = new URL(result)
		expect(url.searchParams.get('operator')).toBe('0')
		expect(url.searchParams.get('difficulty')).toBe('1')
	})

	it('adds deterministic seed when provided', () => {
		const result = buildCopyLinkUrl('https://example.com/?operator=0', 42)
		const url = new URL(result)
		expect(url.searchParams.get('seed')).toBe('42')
	})

	it('removes seed when omitted and encodes spaces as %20', () => {
		const result = buildCopyLinkUrl(
			'https://example.com/?operator=0&seed=9&note=Fast+Math'
		)
		const url = new URL(result)
		expect(url.searchParams.get('seed')).toBeNull()
		expect(url.searchParams.get('note')).toBe('Fast Math')
		expect(result).not.toContain('+')
	})
})

describe('buildPathWithQuizQueryParams', () => {
	it('preserves only canonical quiz-setting params', () => {
		const sourceParams = new URLSearchParams(
			'operator=0&difficulty=1&foo=bar&animate=false&replay=true'
		)

		const result = buildPathWithQuizQueryParams('/settings', sourceParams)
		const url = new URL(result, 'https://example.com')

		expect(url.pathname).toBe('/settings')
		expect(url.searchParams.get('operator')).toBe('0')
		expect(url.searchParams.get('difficulty')).toBe('1')

		expect(url.searchParams.get('foo')).toBeNull()
		expect(url.searchParams.get('animate')).toBeNull()
		expect(url.searchParams.get('replay')).toBeNull()
	})

	it('returns bare path when source has no quiz-setting params', () => {
		const result = buildPathWithQuizQueryParams(
			'/',
			new URLSearchParams('foo=bar')
		)

		expect(result).toBe('/')
	})

	it('preserves non-canonical query params for paths outside the forwarding policy', () => {
		const result = buildPathWithQuizQueryParams(
			'/results',
			new URLSearchParams('duration=0&foo=bar&replay=true'),
			'#summary'
		)

		expect(result).toBe('/results?duration=0&foo=bar&replay=true#summary')
	})
})
