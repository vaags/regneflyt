import { describe, expect, it, vi } from 'vitest'
import {
	createLayoutNavigationActions,
	getLayoutLocationSnapshot
} from '$lib/helpers/layout/layoutNavigationOrchestrator'

const testLocation = {
	pathname: '/quiz',
	search: '?duration=1&operator=0',
	origin: 'https://regneflyt.test'
}

describe('getLayoutLocationSnapshot', () => {
	it('extracts pathname, search, and origin from a location object', () => {
		const snapshot = getLayoutLocationSnapshot(testLocation)
		expect(snapshot).toEqual({
			pathname: '/quiz',
			search: '?duration=1&operator=0',
			origin: 'https://regneflyt.test'
		})
	})
})

describe('createLayoutNavigationActions', () => {
	function makeOptions(
		overrides: Partial<Parameters<typeof createLayoutNavigationActions>[0]> = {}
	) {
		return {
			getLocation: () => testLocation,
			getStartActions: () => undefined,
			navigation: { navigate: vi.fn() },
			seedCache: new Map<string, number>(),
			clipboard: {
				showToast: vi.fn(),
				copyTextWithFeedback: vi.fn(),
				getWriteText: () => undefined
			},
			getMessages: () => ({
				validationError: 'validation-error',
				copyError: 'copy-error',
				deterministicSuccess: 'deterministic-success',
				standardSuccess: 'standard-success'
			}),
			...overrides
		}
	}

	describe('getCurrentLocation', () => {
		it('returns snapshot of current location', () => {
			const { getCurrentLocation } =
				createLayoutNavigationActions(makeOptions())
			expect(getCurrentLocation()).toEqual({
				pathname: '/quiz',
				search: '?duration=1&operator=0',
				origin: 'https://regneflyt.test'
			})
		})
	})

	describe('startQuizFromCurrentQuery', () => {
		it('navigates to /quiz with canonical params from current search', () => {
			const navigate = vi.fn()
			const { startQuizFromCurrentQuery } = createLayoutNavigationActions(
				makeOptions({
					getLocation: () => ({
						pathname: '/',
						search:
							'?duration=1&showProgressBar=true&operator=0&addMin=1&addMax=10&subMin=1&subMax=10&mulValues=2,3,4,5,6,7,8,9,10&divValues=2,3,4,5,6,7,8,9,10&puzzleMode=0&difficulty=1&allowNegativeAnswers=false',
						origin: 'https://regneflyt.test'
					}),
					navigation: { navigate }
				})
			)

			startQuizFromCurrentQuery()

			expect(navigate).toHaveBeenCalledOnce()
			expect(navigate).toHaveBeenCalledWith(expect.stringContaining('/quiz?'))
			expect(navigate).toHaveBeenCalledWith(
				expect.stringContaining('duration=1')
			)
		})
	})

	describe('copySetupLinkToClipboard', () => {
		it('calls copyTextWithFeedback with location search and origin', async () => {
			const copyTextWithFeedback = vi.fn()
			const { copySetupLinkToClipboard } = createLayoutNavigationActions(
				makeOptions({
					getLocation: () => ({
						pathname: '/',
						search:
							'?duration=1&showProgressBar=true&operator=0&addMin=1&addMax=10&subMin=1&subMax=10&mulValues=2,3,4,5,6,7,8,9,10&divValues=2,3,4,5,6,7,8,9,10&puzzleMode=0&difficulty=1&allowNegativeAnswers=false',
						origin: 'https://regneflyt.test'
					}),
					clipboard: {
						showToast: vi.fn(),
						copyTextWithFeedback,
						getWriteText: () => undefined
					}
				})
			)

			await copySetupLinkToClipboard(false)

			expect(copyTextWithFeedback).toHaveBeenCalledOnce()
			const call = copyTextWithFeedback.mock.calls[0]
			if (call) {
				expect(call[0]).toContain('https://regneflyt.test')
			}
		})

		it('includes deterministic seed when deterministic=true', async () => {
			const copyTextWithFeedback = vi.fn()
			const { copySetupLinkToClipboard } = createLayoutNavigationActions(
				makeOptions({
					getLocation: () => ({
						pathname: '/',
						search: '?duration=1&operator=0&difficulty=1&seed=12345',
						origin: 'https://regneflyt.test'
					}),
					clipboard: {
						showToast: vi.fn(),
						copyTextWithFeedback,
						getWriteText: () => undefined
					}
				})
			)

			await copySetupLinkToClipboard(true)

			expect(copyTextWithFeedback).toHaveBeenCalledOnce()
			const call = copyTextWithFeedback.mock.calls[0]
			if (call) {
				// URL should contain the seed from query params
				expect(call[0]).toContain('seed=12345')
			}
		})

		it('caches and reuses deterministic seed for same query', async () => {
			const seedCache = new Map<string, number>()
			const copyTextWithFeedback = vi.fn()
			const { copySetupLinkToClipboard } = createLayoutNavigationActions(
				makeOptions({
					getLocation: () => ({
						pathname: '/',
						search: '?duration=1&operator=0&difficulty=1',
						origin: 'https://regneflyt.test'
					}),
					seedCache,
					clipboard: {
						showToast: vi.fn(),
						copyTextWithFeedback,
						getWriteText: () => undefined
					}
				})
			)

			await copySetupLinkToClipboard(true)
			const firstCall = copyTextWithFeedback.mock.calls[0] as
				unknown[] | undefined
			const firstCallUrl = (firstCall?.[0] as string | undefined) ?? undefined

			copyTextWithFeedback.mockClear()

			await copySetupLinkToClipboard(true)
			const secondCall = copyTextWithFeedback.mock.calls[0] as
				unknown[] | undefined
			const secondCallUrl = (secondCall?.[0] as string | undefined) ?? undefined

			// Same seed should be used for identical queries
			expect(firstCallUrl).toBe(secondCallUrl)
		})

		it('shows validation error when copy is blocked', async () => {
			const showToast = vi.fn()
			const { copySetupLinkToClipboard } = createLayoutNavigationActions(
				makeOptions({
					getStartActions: () => ({
						onStart: () => {},
						canCopyLink: () => false
					}),
					clipboard: {
						showToast,
						copyTextWithFeedback: vi.fn(),
						getWriteText: () => undefined
					}
				})
			)

			await copySetupLinkToClipboard(false)

			expect(showToast).toHaveBeenCalledWith(
				'validation-error',
				expect.objectContaining({ variant: 'error' })
			)
		})

		it('shows copy error when clipboard write fails', async () => {
			const _error = new Error('Clipboard failed')
			const showToast = vi.fn()
			const copyTextWithFeedback = vi
				.fn()
				.mockImplementation(
					(_text: string, options: { onError: () => void }) => {
						options.onError()
						return Promise.resolve()
					}
				)
			const { copySetupLinkToClipboard } = createLayoutNavigationActions(
				makeOptions({
					clipboard: {
						showToast,
						copyTextWithFeedback,
						getWriteText: () => undefined
					}
				})
			)

			await copySetupLinkToClipboard(false)

			expect(showToast).toHaveBeenCalledWith(
				'copy-error',
				expect.objectContaining({ variant: 'error' })
			)
		})

		it('shows success toast when copy succeeds', async () => {
			const showToast = vi.fn()
			const copyTextWithFeedback = vi
				.fn()
				.mockImplementation(
					(_text: string, options: { onSuccess: () => void }) => {
						options.onSuccess()
						return Promise.resolve()
					}
				)
			const { copySetupLinkToClipboard } = createLayoutNavigationActions(
				makeOptions({
					clipboard: {
						showToast,
						copyTextWithFeedback,
						getWriteText: () => undefined
					}
				})
			)

			await copySetupLinkToClipboard(false)

			expect(showToast).toHaveBeenCalledWith('standard-success')
		})
	})

	// Note: E2E integration tests for complete layout navigation flows
	// (context registration, view transitions, actual copy-paste behavior) should be
	// verified in Playwright specs. Unit tests cover factory initialization and options;
	// see tests/e2e/ for end-to-end validation.
})
