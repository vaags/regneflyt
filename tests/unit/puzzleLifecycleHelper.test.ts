import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TimerState } from '#lib/constants/TimerState.ts'
import {
	createPuzzleLifecycle,
	type PuzzleLifecycleOptions,
	type PuzzleLifecycleSnapshot
} from '#lib/helpers/quiz/puzzleLifecycleHelper.ts'

const transitionMs = 200
const feedbackMs = 1000

function createHarness(overrides: Partial<PuzzleLifecycleOptions> = {}) {
	let clockMs = 0
	const snapshots: PuzzleLifecycleSnapshot[] = []
	const onNextPuzzle = vi.fn()
	const lifecycle = createPuzzleLifecycle({
		startsAnswering: false,
		isUnlimited: false,
		transitionMs,
		feedbackMs,
		onNextPuzzle,
		now: () => clockMs,
		...overrides
	})
	lifecycle.subscribe((snapshot) => {
		snapshots.push(snapshot)
	})

	return {
		lifecycle,
		snapshots,
		onNextPuzzle,
		advance: (ms: number) => {
			clockMs += ms
			vi.advanceTimersByTime(ms)
		}
	}
}

describe('createPuzzleLifecycle', () => {
	beforeEach(() => vi.useFakeTimers())
	afterEach(() => vi.useRealTimers())

	it('moves from countdown through the transition into answering', () => {
		const { lifecycle, advance } = createHarness()
		expect(lifecycle.getSnapshot()).toEqual({
			phase: 'countdown',
			progressBarState: TimerState.Initialized,
			quizTimeoutState: TimerState.Initialized
		})

		expect(lifecycle.start()).toBe(true)
		expect(lifecycle.getSnapshot()).toEqual({
			phase: 'transition',
			progressBarState: TimerState.Stopped,
			quizTimeoutState: TimerState.Stopped
		})

		advance(transitionMs)
		expect(lifecycle.getSnapshot()).toEqual({
			phase: 'answering',
			progressBarState: TimerState.Started,
			quizTimeoutState: TimerState.Started
		})
	})

	it('starts only once', () => {
		const { lifecycle, snapshots } = createHarness()
		lifecycle.start()

		expect(lifecycle.start()).toBe(false)
		expect(snapshots).toHaveLength(1)
	})

	it('leaves the quiz timer untouched for unlimited quizzes', () => {
		const { lifecycle, advance } = createHarness({ isUnlimited: true })
		lifecycle.start()
		advance(transitionMs)

		expect(lifecycle.getSnapshot().quizTimeoutState).toBe(
			TimerState.Initialized
		)
	})

	it('accepts answers immediately when the quiz is already running', () => {
		const { lifecycle, advance } = createHarness({ startsAnswering: true })
		advance(1500)
		const evaluate = vi.fn(() => true)

		expect(lifecycle.submitAttempt(evaluate)).toBe(true)
		expect(evaluate).toHaveBeenCalledWith(1.5)
	})

	it('rejects attempts during the countdown and the transition', () => {
		const { lifecycle } = createHarness()
		const evaluate = vi.fn(() => true)

		expect(lifecycle.submitAttempt(evaluate)).toBe(false)
		lifecycle.start()
		expect(lifecycle.submitAttempt(evaluate)).toBe(false)
		expect(evaluate).not.toHaveBeenCalled()
	})

	it('measures each attempt from the moment its puzzle starts answering', () => {
		const { lifecycle, advance } = createHarness()
		lifecycle.start()
		advance(transitionMs)
		advance(500)
		const evaluate = vi.fn(() => true)

		lifecycle.submitAttempt(evaluate)
		advance(transitionMs)
		advance(250)
		lifecycle.submitAttempt(evaluate)

		expect(evaluate.mock.calls).toEqual([[0.5], [0.25]])
	})

	it('advances immediately after a correct answer', () => {
		const { lifecycle, onNextPuzzle, advance } = createHarness()
		lifecycle.start()
		advance(transitionMs)

		lifecycle.submitAttempt(() => true)

		expect(onNextPuzzle).toHaveBeenCalledOnce()
		expect(lifecycle.getSnapshot()).toMatchObject({
			phase: 'transition',
			progressBarState: TimerState.Stopped,
			quizTimeoutState: TimerState.Started
		})
		advance(transitionMs)
		expect(lifecycle.getSnapshot().phase).toBe('answering')
	})

	it('holds wrong-answer feedback before advancing', () => {
		const { lifecycle, onNextPuzzle, advance } = createHarness()
		lifecycle.start()
		advance(transitionMs)

		lifecycle.submitAttempt(() => false)
		expect(lifecycle.getSnapshot()).toMatchObject({
			phase: 'feedback',
			progressBarState: TimerState.Paused
		})

		advance(feedbackMs - 1)
		expect(onNextPuzzle).not.toHaveBeenCalled()
		advance(1)
		expect(onNextPuzzle).toHaveBeenCalledOnce()
		expect(lifecycle.getSnapshot().phase).toBe('transition')
	})

	it('accepts one answer per puzzle, including re-entrant submissions', () => {
		const { lifecycle, advance } = createHarness()
		lifecycle.start()
		advance(transitionMs)
		const reentrantResults: boolean[] = []
		const evaluate = vi.fn(() => {
			reentrantResults.push(lifecycle.submitAttempt(() => false))
			return false
		})

		expect(lifecycle.submitAttempt(evaluate)).toBe(true)
		expect(lifecycle.submitAttempt(evaluate)).toBe(false)

		expect(evaluate).toHaveBeenCalledOnce()
		expect(reentrantResults).toEqual([false])
	})

	it('drops pending feedback when the quiz ends during feedback', () => {
		const { lifecycle, onNextPuzzle, advance } = createHarness()
		lifecycle.start()
		advance(transitionMs)
		lifecycle.submitAttempt(() => false)

		lifecycle.end()
		advance(feedbackMs + transitionMs)

		expect(onNextPuzzle).not.toHaveBeenCalled()
		expect(lifecycle.getSnapshot().phase).toBe('ended')
		expect(lifecycle.submitAttempt(() => true)).toBe(false)
		expect(vi.getTimerCount()).toBe(0)
	})

	it('never reaches answering when the quiz ends during a transition', () => {
		const { lifecycle, advance } = createHarness()
		lifecycle.start()

		lifecycle.end()
		advance(transitionMs)

		expect(lifecycle.getSnapshot().phase).toBe('ended')
		expect(lifecycle.start()).toBe(false)
		expect(vi.getTimerCount()).toBe(0)
	})

	it('does not advance when evaluating the attempt ends the quiz', () => {
		const { lifecycle, onNextPuzzle, advance } = createHarness()
		lifecycle.start()
		advance(transitionMs)

		lifecycle.submitAttempt(() => {
			lifecycle.end()
			return true
		})

		expect(onNextPuzzle).not.toHaveBeenCalled()
		expect(lifecycle.getSnapshot().phase).toBe('ended')
	})

	it('stops notifying a listener after it unsubscribes', () => {
		const { lifecycle } = createHarness()
		const listener = vi.fn()
		const unsubscribe = lifecycle.subscribe(listener)

		lifecycle.start()
		unsubscribe()
		lifecycle.end()

		expect(listener).toHaveBeenCalledOnce()
	})

	it('publishes the end only once', () => {
		const { lifecycle, snapshots } = createHarness()

		lifecycle.end()
		lifecycle.end()

		expect(snapshots).toEqual([
			{
				phase: 'ended',
				progressBarState: TimerState.Initialized,
				quizTimeoutState: TimerState.Initialized
			}
		])
	})
})
