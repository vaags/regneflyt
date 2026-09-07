// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import {
	resolveLayoutNavigationTransition,
	applyLayoutTransitionStartEffects,
	clearLayoutTransitionClasses,
	getLayoutTransitionCompletionEffects,
	executeLayoutNavigationTransition,
	executeLayoutOnNavigateTransition
} from '#lib/helpers/layout/layoutViewTransitionHelper.ts'

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
			shouldAwaitTick: true
		})
		expect(root.classList.contains('quiz-entering')).toBe(true)
		expect(root.style.getPropertyValue('--measured-global-nav-height')).toBe('')
	})

	it('applies leaving-quiz classes without deferring nav mode', () => {
		const root = document.createElement('html')
		const transition = resolveLayoutNavigationTransition('/quiz', '/settings')

		expect(applyLayoutTransitionStartEffects(root, transition)).toEqual({
			suppressStickyGlobalNavTransitionName: true,
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
				shouldAwaitTick: true
			})
		).toEqual({
			restoreStickyGlobalNavTransitionName: true
		})
	})

	it('keeps completion cleanup disabled when start effects are disabled', () => {
		expect(
			getLayoutTransitionCompletionEffects({
				suppressStickyGlobalNavTransitionName: false,
				shouldAwaitTick: false
			})
		).toEqual({
			restoreStickyGlobalNavTransitionName: false
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
		const resolveBeforeNavigationComplete = vi.fn(() => {
			resolveCalls.push('resolve')
		})

		await executeLayoutNavigationTransition({
			documentTarget,
			transition,
			navigationComplete,
			awaitTick,
			onBeforeNavigationCompleteResolved: resolveBeforeNavigationComplete,
			onSetStickyTransitionSuppressed: setSticky
		})

		expect(setSticky).toHaveBeenCalledWith(true)
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
	})

	it('restores sticky suppression without deferring nav mode when leaving quiz', async () => {
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
		const resolveBeforeNavigationComplete = vi.fn()

		await executeLayoutNavigationTransition({
			documentTarget,
			transition,
			navigationComplete,
			awaitTick,
			onBeforeNavigationCompleteResolved: resolveBeforeNavigationComplete,
			onSetStickyTransitionSuppressed: setSticky
		})

		expect(setSticky).toHaveBeenCalledWith(true)

		const transitionCallbackPromise = runTransition?.()
		resolveNavigationComplete?.()
		await transitionCallbackPromise
		await navigationComplete

		expect(setSticky).toHaveBeenCalledWith(false)

		resolveFinished?.()
		await finished
		await Promise.resolve()

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
			onSetStickyTransitionSuppressed: vi.fn()
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
			onSetStickyTransitionSuppressed: vi.fn()
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
			onSetStickyTransitionSuppressed: vi.fn()
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
			onSetStickyTransitionSuppressed: vi.fn()
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
