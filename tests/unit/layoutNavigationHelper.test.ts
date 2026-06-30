// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import {
	normalizeLayoutPageTitleKey,
	getLayoutPageTitle,
	getStickyGlobalNavTransitionName
} from '$lib/helpers/layout/layoutPageTitleHelper'
import {
	shouldShowDeterministicCopyLinkAction,
	canCopyLink,
	resolveCopyLinkSearchParams,
	resolveCopyLinkSuccessMessage,
	resolveDeterministicSeedForQuery,
	buildCanonicalCopyBaseUrl,
	createCopySetupLinkToClipboard
} from '$lib/helpers/layout/layoutCopyLinkHelper'
import { handleLayoutBeforeNavigate } from '$lib/helpers/layout/layoutBeforeNavigateHelper'
import {
	resolveLayoutNavigationTransition,
	applyLayoutTransitionStartEffects,
	clearLayoutTransitionClasses,
	getLayoutTransitionCompletionEffects,
	getLayoutTransitionFinishedEffects,
	executeLayoutNavigationTransition,
	executeLayoutOnNavigateTransition
} from '$lib/helpers/layout/layoutViewTransitionHelper'
import { customDifficultyId } from '$lib/models/AdaptiveProfile'

const messages = {
	appTitleFull: 'Regneflyt Full',
	appTitle: 'Regneflyt',
	quizTitle: 'Puzzles',
	resultsTitle: 'Results',
	settingsTitle: 'Settings'
}

describe('layoutHelper', () => {
	it('coerces unknown page-title keys to settings for fallback parity', () => {
		expect(normalizeLayoutPageTitleKey('home')).toBe('home')
		expect(normalizeLayoutPageTitleKey('default')).toBe('default')
		expect(normalizeLayoutPageTitleKey('unknown')).toBe('settings')
	})

	it('returns full app title for home/default pages', () => {
		expect(getLayoutPageTitle('home', messages)).toBe('Regneflyt Full')
		expect(getLayoutPageTitle('default', messages)).toBe('Regneflyt Full')
	})

	it('returns route-specific title suffixes for section pages', () => {
		expect(getLayoutPageTitle('quiz', messages)).toBe('Puzzles - Regneflyt')
		expect(getLayoutPageTitle('results', messages)).toBe('Results - Regneflyt')
		expect(getLayoutPageTitle('settings', messages)).toBe(
			'Settings - Regneflyt'
		)
	})

	it('maps supported paths to sticky global nav transition names', () => {
		expect(getStickyGlobalNavTransitionName('/', false)).toBe(
			'sticky-global-nav-menu'
		)
		expect(getStickyGlobalNavTransitionName('/results', false)).toBe(
			'sticky-global-nav-results'
		)
		expect(getStickyGlobalNavTransitionName('/settings', false)).toBe(
			'sticky-global-nav-settings'
		)
		expect(getStickyGlobalNavTransitionName('/quiz', false)).toBeUndefined()
	})

	it('suppresses sticky global nav transition name when requested', () => {
		expect(getStickyGlobalNavTransitionName('/', true)).toBeUndefined()
	})

	it('toggles deterministic copy-link action only for custom adaptive difficulty', () => {
		expect(
			shouldShowDeterministicCopyLinkAction(`?difficulty=${customDifficultyId}`)
		).toBe(true)
		expect(shouldShowDeterministicCopyLinkAction('?difficulty=1')).toBe(false)
		expect(shouldShowDeterministicCopyLinkAction('')).toBe(false)
	})
})

describe('handleLayoutBeforeNavigate', () => {
	it('does nothing when navigation target is missing', () => {
		const cancelNavigation = vi.fn()
		const guardHandler = vi.fn()

		handleLayoutBeforeNavigate(null, cancelNavigation, guardHandler)

		expect(guardHandler).not.toHaveBeenCalled()
	})

	it('passes external navigation payload to guard handler', () => {
		const cancelNavigation = vi.fn()
		const guardHandler = vi.fn()
		const to = {
			url: new URL('https://example.com/results?difficulty=1'),
			route: { id: null },
			params: null,
			scroll: null
		}

		handleLayoutBeforeNavigate(to, cancelNavigation, guardHandler)

		expect(guardHandler).toHaveBeenCalledWith({
			toUrl: to.url,
			isInternalNavigation: false,
			cancelNavigation
		})
	})

	it('marks navigation as internal when route id exists', () => {
		const cancelNavigation = vi.fn()
		const guardHandler = vi.fn()
		const to = {
			url: new URL('https://example.com/quiz'),
			route: { id: '/quiz' as const },
			params: {},
			scroll: null
		}

		handleLayoutBeforeNavigate(to, cancelNavigation, guardHandler)

		expect(guardHandler).toHaveBeenCalledWith({
			toUrl: to.url,
			isInternalNavigation: true,
			cancelNavigation
		})
	})
})

describe('resolveLayoutNavigationTransition', () => {
	it('skips transitions when destination path is missing', () => {
		expect(resolveLayoutNavigationTransition('/', undefined)).toEqual({
			shouldRunTransition: false,
			includesQuizRoute: false,
			leavingQuiz: false,
			enteringQuiz: false
		})
	})

	it('skips transitions when path does not change', () => {
		expect(resolveLayoutNavigationTransition('/results', '/results')).toEqual({
			shouldRunTransition: false,
			includesQuizRoute: false,
			leavingQuiz: false,
			enteringQuiz: false
		})
	})

	it('detects entering quiz route transitions', () => {
		expect(resolveLayoutNavigationTransition('/', '/quiz')).toEqual({
			shouldRunTransition: true,
			includesQuizRoute: true,
			leavingQuiz: false,
			enteringQuiz: true
		})
	})

	it('detects leaving quiz route transitions', () => {
		expect(resolveLayoutNavigationTransition('/quiz', '/settings')).toEqual({
			shouldRunTransition: true,
			includesQuizRoute: true,
			leavingQuiz: true,
			enteringQuiz: false
		})
	})

	it('handles non-quiz route transitions', () => {
		expect(resolveLayoutNavigationTransition('/results', '/settings')).toEqual({
			shouldRunTransition: true,
			includesQuizRoute: false,
			leavingQuiz: false,
			enteringQuiz: false
		})
	})
})

describe('applyLayoutTransitionStartEffects', () => {
	it('does nothing for non-quiz transitions', () => {
		const root = document.createElement('html')
		const transition = resolveLayoutNavigationTransition(
			'/results',
			'/settings'
		)

		expect(applyLayoutTransitionStartEffects(root, transition)).toEqual({
			suppressStickyGlobalNavTransitionName: false,
			deferNavMode: false,
			shouldAwaitTick: false
		})
		expect(root.classList.contains('quiz-entering')).toBe(false)
		expect(root.classList.contains('quiz-leaving')).toBe(false)
	})

	it('applies entering-quiz classes and effects', () => {
		const root = document.createElement('html')
		root.style.setProperty('--measured-global-nav-height', '72px')
		const transition = resolveLayoutNavigationTransition('/', '/quiz')

		expect(applyLayoutTransitionStartEffects(root, transition)).toEqual({
			suppressStickyGlobalNavTransitionName: true,
			deferNavMode: false,
			shouldAwaitTick: true
		})
		expect(root.classList.contains('quiz-entering')).toBe(true)
		expect(root.style.getPropertyValue('--measured-global-nav-height')).toBe('')
	})

	it('applies leaving-quiz classes and deferred nav mode', () => {
		const root = document.createElement('html')
		const transition = resolveLayoutNavigationTransition('/quiz', '/settings')

		expect(applyLayoutTransitionStartEffects(root, transition)).toEqual({
			suppressStickyGlobalNavTransitionName: true,
			deferNavMode: true,
			shouldAwaitTick: true
		})
		expect(root.classList.contains('quiz-leaving')).toBe(true)
	})
})

describe('clearLayoutTransitionClasses', () => {
	it('removes quiz transition classes from root element', () => {
		const root = document.createElement('html')
		root.classList.add('quiz-entering', 'quiz-leaving')

		clearLayoutTransitionClasses(root)

		expect(root.classList.contains('quiz-entering')).toBe(false)
		expect(root.classList.contains('quiz-leaving')).toBe(false)
	})
})

describe('getLayoutTransitionCompletionEffects', () => {
	it('maps start effects to completion cleanup flags', () => {
		expect(
			getLayoutTransitionCompletionEffects({
				suppressStickyGlobalNavTransitionName: true,
				deferNavMode: true,
				shouldAwaitTick: true
			})
		).toEqual({
			resetDeferringNavMode: true,
			restoreStickyGlobalNavTransitionName: true
		})
	})

	it('keeps completion cleanup disabled when start effects are disabled', () => {
		expect(
			getLayoutTransitionCompletionEffects({
				suppressStickyGlobalNavTransitionName: false,
				deferNavMode: false,
				shouldAwaitTick: false
			})
		).toEqual({
			resetDeferringNavMode: false,
			restoreStickyGlobalNavTransitionName: false
		})
	})
})

describe('getLayoutTransitionFinishedEffects', () => {
	it('maps deferred mode to finished cleanup flags', () => {
		expect(
			getLayoutTransitionFinishedEffects({
				suppressStickyGlobalNavTransitionName: true,
				deferNavMode: true,
				shouldAwaitTick: true
			})
		).toEqual({
			resetNavModeToDefault: true,
			resetDeferringNavMode: true
		})
	})

	it('keeps finished cleanup disabled when deferred mode is false', () => {
		expect(
			getLayoutTransitionFinishedEffects({
				suppressStickyGlobalNavTransitionName: true,
				deferNavMode: false,
				shouldAwaitTick: true
			})
		).toEqual({
			resetNavModeToDefault: false,
			resetDeferringNavMode: false
		})
	})
})

describe('executeLayoutNavigationTransition', () => {
	it('runs entering-quiz transition and restores sticky suppression after navigation completes', async () => {
		const root = document.createElement('html')
		root.style.setProperty('--measured-global-nav-height', '72px')
		const transition = resolveLayoutNavigationTransition('/', '/quiz')
		const awaitTick = () => Promise.resolve(undefined)
		const resolveCalls: string[] = []

		let resolveFinished: (() => void) | undefined
		const finished = new Promise<void>((resolve) => {
			resolveFinished = resolve
		})
		let runTransition: (() => Promise<void>) | undefined
		const documentTarget = {
			documentElement: root,
			startViewTransition(callback: () => Promise<void>) {
				runTransition = callback
				return { finished }
			}
		}

		let resolveNavigationComplete: (() => void) | undefined
		const navigationComplete = new Promise<void>((resolve) => {
			resolveNavigationComplete = resolve
		})

		const setSticky = vi.fn((value: boolean) => {
			resolveCalls.push(`sticky:${String(value)}`)
		})
		const setDeferring = vi.fn((value: boolean) => {
			resolveCalls.push(`defer:${String(value)}`)
		})
		const resetNavMode = vi.fn(() => {
			resolveCalls.push('nav:default')
		})
		const resolveBeforeNavigationComplete = vi.fn(() => {
			resolveCalls.push('resolve')
		})

		await executeLayoutNavigationTransition({
			documentTarget,
			transition,
			navigationComplete,
			awaitTick,
			onBeforeNavigationCompleteResolved: resolveBeforeNavigationComplete,
			onSetStickyTransitionSuppressed: setSticky,
			onSetDeferringNavMode: setDeferring,
			onResetNavModeToDefault: resetNavMode
		})

		expect(setSticky).toHaveBeenCalledWith(true)
		expect(setDeferring).not.toHaveBeenCalledWith(true)
		expect(root.classList.contains('quiz-entering')).toBe(true)
		expect(root.style.getPropertyValue('--measured-global-nav-height')).toBe('')

		const transitionCallbackPromise = runTransition?.()
		expect(resolveBeforeNavigationComplete).toHaveBeenCalledTimes(1)
		expect(setSticky).toHaveBeenLastCalledWith(true)

		resolveNavigationComplete?.()
		await transitionCallbackPromise
		await navigationComplete
		expect(setSticky).toHaveBeenLastCalledWith(false)

		resolveFinished?.()
		await finished
		await Promise.resolve()
		expect(root.classList.contains('quiz-entering')).toBe(false)
		expect(resetNavMode).not.toHaveBeenCalled()
	})

	it('resets deferred nav mode and nav mode when leaving quiz', async () => {
		const root = document.createElement('html')
		const transition = resolveLayoutNavigationTransition('/quiz', '/settings')
		const awaitTick = () => Promise.resolve(undefined)

		let resolveFinished: (() => void) | undefined
		const finished = new Promise<void>((resolve) => {
			resolveFinished = resolve
		})
		let runTransition: (() => Promise<void>) | undefined
		const documentTarget = {
			documentElement: root,
			startViewTransition(callback: () => Promise<void>) {
				runTransition = callback
				return { finished }
			}
		}

		let resolveNavigationComplete: (() => void) | undefined
		const navigationComplete = new Promise<void>((resolve) => {
			resolveNavigationComplete = resolve
		})

		const setSticky = vi.fn()
		const setDeferring = vi.fn()
		const resetNavMode = vi.fn()
		const resolveBeforeNavigationComplete = vi.fn()

		await executeLayoutNavigationTransition({
			documentTarget,
			transition,
			navigationComplete,
			awaitTick,
			onBeforeNavigationCompleteResolved: resolveBeforeNavigationComplete,
			onSetStickyTransitionSuppressed: setSticky,
			onSetDeferringNavMode: setDeferring,
			onResetNavModeToDefault: resetNavMode
		})

		expect(setDeferring).toHaveBeenCalledWith(true)
		expect(setSticky).toHaveBeenCalledWith(true)

		const transitionCallbackPromise = runTransition?.()
		resolveNavigationComplete?.()
		await transitionCallbackPromise
		await navigationComplete

		expect(setDeferring).toHaveBeenCalledWith(false)
		expect(setSticky).toHaveBeenCalledWith(false)

		resolveFinished?.()
		await finished
		await Promise.resolve()

		expect(resetNavMode).toHaveBeenCalledTimes(1)
		expect(root.classList.contains('quiz-leaving')).toBe(false)
	})
})

describe('executeLayoutOnNavigateTransition', () => {
	it('returns undefined when view transitions are unavailable', () => {
		const result = executeLayoutOnNavigateTransition({
			fromPath: '/',
			toPath: '/quiz',
			documentTarget: undefined,
			navigationComplete: Promise.resolve(),
			awaitTick: () => Promise.resolve(undefined),
			onSetStickyTransitionSuppressed: vi.fn(),
			onSetDeferringNavMode: vi.fn(),
			onResetNavModeToDefault: vi.fn()
		})

		expect(result).toBeUndefined()
	})

	it('returns undefined when transition should not run', () => {
		const result = executeLayoutOnNavigateTransition({
			fromPath: '/results',
			toPath: '/results',
			documentTarget: {
				documentElement: document.createElement('html'),
				startViewTransition: vi.fn(() => ({
					finished: Promise.resolve()
				}))
			},
			navigationComplete: Promise.resolve(),
			awaitTick: () => Promise.resolve(undefined),
			onSetStickyTransitionSuppressed: vi.fn(),
			onSetDeferringNavMode: vi.fn(),
			onResetNavModeToDefault: vi.fn()
		})

		expect(result).toBeUndefined()
	})

	it('returns a promise and starts transition execution when eligible', async () => {
		const root = document.createElement('html')
		let resolveFinished: (() => void) | undefined
		const finished = new Promise<void>((resolve) => {
			resolveFinished = resolve
		})

		let resolveNavigationComplete: (() => void) | undefined
		const navigationComplete = new Promise<void>((resolve) => {
			resolveNavigationComplete = resolve
		})

		let runTransitionCallback: (() => Promise<void>) | undefined
		const result = executeLayoutOnNavigateTransition({
			fromPath: '/quiz',
			toPath: '/settings',
			documentTarget: {
				documentElement: root,
				startViewTransition(callback: () => Promise<void>) {
					runTransitionCallback = callback
					return { finished }
				}
			},
			navigationComplete,
			awaitTick: () => Promise.resolve(undefined),
			onSetStickyTransitionSuppressed: vi.fn(),
			onSetDeferringNavMode: vi.fn(),
			onResetNavModeToDefault: vi.fn()
		})

		expect(result).toBeInstanceOf(Promise)
		await Promise.resolve()
		expect(runTransitionCallback).toBeTypeOf('function')

		const callbackPromise = runTransitionCallback?.()
		resolveNavigationComplete?.()
		await callbackPromise
		await navigationComplete
		resolveFinished?.()
		await finished
		await Promise.resolve()

		await result
	})

	it('binds startViewTransition to document target receiver', async () => {
		const root = document.createElement('html')
		let resolveFinished: (() => void) | undefined
		const finished = new Promise<void>((resolve) => {
			resolveFinished = resolve
		})

		let resolveNavigationComplete: (() => void) | undefined
		const navigationComplete = new Promise<void>((resolve) => {
			resolveNavigationComplete = resolve
		})

		let runTransitionCallback: (() => Promise<void>) | undefined
		const documentTarget = {
			documentElement: root,
			startViewTransition(
				this: { documentElement: HTMLElement },
				callback: () => Promise<void>
			) {
				if (this.documentElement !== root) {
					throw new TypeError('Illegal invocation')
				}
				runTransitionCallback = callback
				return { finished }
			}
		}

		const result = executeLayoutOnNavigateTransition({
			fromPath: '/quiz',
			toPath: '/settings',
			documentTarget,
			navigationComplete,
			awaitTick: () => Promise.resolve(undefined),
			onSetStickyTransitionSuppressed: vi.fn(),
			onSetDeferringNavMode: vi.fn(),
			onResetNavModeToDefault: vi.fn()
		})

		expect(result).toBeInstanceOf(Promise)
		await Promise.resolve()
		expect(runTransitionCallback).toBeTypeOf('function')

		const callbackPromise = runTransitionCallback?.()
		resolveNavigationComplete?.()
		await callbackPromise
		await navigationComplete
		resolveFinished?.()
		await finished
		await Promise.resolve()

		await expect(result).resolves.toBeUndefined()
	})
})

describe('canCopyLink', () => {
	it('allows copy when no start actions are provided', () => {
		expect(canCopyLink(undefined)).toBe(true)
	})

	it('allows copy when guard callback allows it', () => {
		expect(canCopyLink({ canCopyLink: () => true })).toBe(true)
	})

	it('blocks copy when guard callback rejects it', () => {
		expect(canCopyLink({ canCopyLink: () => false })).toBe(false)
	})
})

describe('resolveCopyLinkSearchParams', () => {
	it('uses sticky start-action search params when provided', () => {
		const params = resolveCopyLinkSearchParams(
			{
				getCopyLinkSearchParams: () =>
					new URLSearchParams('difficulty=0&duration=2')
			},
			'difficulty=1&duration=1'
		)

		expect(params.toString()).toBe('difficulty=0&duration=2')
	})

	it('falls back to current location search when no override exists', () => {
		const params = resolveCopyLinkSearchParams(
			undefined,
			'?difficulty=1&seed=9'
		)
		expect(params.toString()).toBe('difficulty=1&seed=9')
	})
})

describe('resolveCopyLinkSuccessMessage', () => {
	it('returns deterministic success message when deterministic mode is active', () => {
		expect(
			resolveCopyLinkSuccessMessage(true, {
				deterministic: 'deterministic',
				standard: 'standard'
			})
		).toBe('deterministic')
	})

	it('returns standard success message when deterministic mode is inactive', () => {
		expect(
			resolveCopyLinkSuccessMessage(false, {
				deterministic: 'deterministic',
				standard: 'standard'
			})
		).toBe('standard')
	})
})

describe('resolveDeterministicSeedForQuery', () => {
	it('returns explicit seed from query when present', () => {
		const cache = new Map<string, number>()
		const searchParams = new URLSearchParams('seed=1234&difficulty=1')

		expect(resolveDeterministicSeedForQuery(searchParams, cache)).toBe(1234)
		expect(cache.size).toBe(0)
	})

	it('returns cached seed for same canonical quiz query', () => {
		const cache = new Map<string, number>()
		const baseQuery = new URLSearchParams(
			'duration=1&showProgressBar=true&operator=0&addMin=1&addMax=10&subMin=1&subMax=10&mulValues=2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&divValues=2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&puzzleMode=0&difficulty=1&allowNegativeAnswers=false'
		)
		const first = resolveDeterministicSeedForQuery(baseQuery, cache, () => 0.5)
		const second = resolveDeterministicSeedForQuery(
			baseQuery,
			cache,
			() => 0.75
		)

		expect(first).toBe(second)
		expect(cache.size).toBe(1)
	})

	it('generates deterministic uint32 seed when missing', () => {
		const cache = new Map<string, number>()
		const searchParams = new URLSearchParams(
			`duration=1&showProgressBar=true&operator=0&addMin=1&addMax=10&subMin=1&subMax=10&mulValues=2,3,4,5,6,7,8,9,10&divValues=2,3,4,5,6,7,8,9,10&puzzleMode=0&difficulty=${customDifficultyId}&allowNegativeAnswers=false`
		)

		const seed = resolveDeterministicSeedForQuery(
			searchParams,
			cache,
			() => 0.25
		)

		expect(seed).toBe(1073741824)
		expect(cache.size).toBe(1)
	})
})

describe('buildCanonicalCopyBaseUrl', () => {
	it('returns root-based canonical quiz URL', () => {
		const searchParams = new URLSearchParams(
			'duration=1&showProgressBar=true&operator=0&addMin=1&addMax=10&subMin=1&subMax=10&mulValues=2,3,4,5,6,7,8,9,10&divValues=2,3,4,5,6,7,8,9,10&puzzleMode=0&difficulty=1&allowNegativeAnswers=false'
		)

		const baseUrl = buildCanonicalCopyBaseUrl(
			searchParams,
			'https://regneflyt.test/quiz?ignored=true'
		)

		expect(baseUrl.startsWith('https://regneflyt.test/?')).toBe(true)
		expect(baseUrl.includes('duration=1')).toBe(true)
		expect(baseUrl.includes('difficulty=1')).toBe(true)
	})
})

describe('createCopySetupLinkToClipboard', () => {
	it('shows validation error toast when copy is blocked', async () => {
		const showToast = vi.fn()
		const copyTextWithFeedback = vi.fn()
		const copySetupLinkToClipboard = createCopySetupLinkToClipboard({
			getStartActions: () => ({ canCopyLink: () => false }),
			seedCache: new Map<string, number>(),
			showToast,
			copyTextWithFeedback,
			getWriteText: () => undefined
		})

		await copySetupLinkToClipboard({
			deterministic: false,
			locationSearch: '?difficulty=1',
			origin: 'https://regneflyt.test',
			messages: {
				validationError: 'validation-error',
				copyError: 'copy-error',
				deterministicSuccess: 'deterministic-success',
				standardSuccess: 'standard-success'
			}
		})

		expect(showToast).toHaveBeenCalledWith('validation-error', {
			variant: 'error'
		})
		expect(copyTextWithFeedback).not.toHaveBeenCalled()
	})

	it('copies deterministic link and emits success toast', async () => {
		const showToast = vi.fn()
		const copiedPayload: string[] = []
		const copyTextWithFeedback = vi.fn(
			(
				text: string,
				options: {
					onSuccess: () => void
				}
			) => {
				copiedPayload.push(text)
				options.onSuccess()
				return Promise.resolve(undefined)
			}
		)
		const copySetupLinkToClipboard = createCopySetupLinkToClipboard({
			getStartActions: () => undefined,
			seedCache: new Map<string, number>(),
			showToast,
			copyTextWithFeedback,
			getWriteText: () => undefined
		})

		await copySetupLinkToClipboard({
			deterministic: true,
			locationSearch:
				'?duration=1&showProgressBar=true&operator=0&addMin=1&addMax=10&subMin=1&subMax=10&mulValues=2,3,4,5,6,7,8,9,10&divValues=2,3,4,5,6,7,8,9,10&puzzleMode=0&difficulty=1&allowNegativeAnswers=false&seed=123',
			origin: 'https://regneflyt.test',
			messages: {
				validationError: 'validation-error',
				copyError: 'copy-error',
				deterministicSuccess: 'deterministic-success',
				standardSuccess: 'standard-success'
			}
		})

		expect(copiedPayload).toHaveLength(1)
		expect(copiedPayload[0]).toContain('seed=123')
		expect(showToast).toHaveBeenCalledWith('deterministic-success')
	})

	it('shows copy error toast when clipboard write fails', async () => {
		const showToast = vi.fn()
		const copyTextWithFeedback = vi.fn(
			(
				_text: string,
				options: {
					onError: () => void
				}
			) => {
				options.onError()
				return Promise.resolve(undefined)
			}
		)
		const copySetupLinkToClipboard = createCopySetupLinkToClipboard({
			getStartActions: () => undefined,
			seedCache: new Map<string, number>(),
			showToast,
			copyTextWithFeedback,
			getWriteText: () => undefined
		})

		await copySetupLinkToClipboard({
			deterministic: false,
			locationSearch: '?difficulty=1',
			origin: 'https://regneflyt.test',
			messages: {
				validationError: 'validation-error',
				copyError: 'copy-error',
				deterministicSuccess: 'deterministic-success',
				standardSuccess: 'standard-success'
			}
		})

		expect(showToast).toHaveBeenCalledWith('copy-error', {
			variant: 'error'
		})
	})
})

/*
 * ============================================================================
 * E2E Testing Notes for View Transitions
 * ============================================================================
 *
 * This test file covers the orchestration logic for view transitions:
 * - Timing and sequencing of animation frames
 * - State management (deferring nav mode, transition suppression)
 * - CSS class application and cleanup
 * - Promise resolution patterns
 *
 * However, the actual browser View Transitions API behavior should be verified
 * through E2E tests that can observe:
 * - Real CSS animations playing
 * - Actual DOM state changes during transition
 * - Screen transitions completing smoothly
 * - No layout shifts or visual glitches
 *
 * Relevant E2E specs: tests/e2e/quiz-layout.spec.ts and tests/e2e/routing.spec.ts
 * can exercise navigation scenarios that trigger these transitions in a real browser.
 */
