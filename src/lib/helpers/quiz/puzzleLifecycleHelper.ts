import { TimerState } from '#lib/constants/TimerState.ts'

/**
 * - `countdown`: waiting for the pre-quiz countdown.
 * - `transition`: the next puzzle is animating in; answers are not accepted.
 * - `answering`: the attempt timer runs and one answer may be submitted.
 * - `feedback`: a wrong answer is shown before the next puzzle.
 * - `ended`: the quiz finished or the view was torn down; nothing else runs.
 */
export type PuzzleLifecyclePhase =
	'countdown' | 'transition' | 'answering' | 'feedback' | 'ended'

export type PuzzleLifecycleSnapshot = {
	readonly phase: PuzzleLifecyclePhase
	readonly progressBarState: TimerState
	readonly quizTimeoutState: TimerState
}

export type PuzzleLifecycleOptions = {
	startsAnswering: boolean
	isUnlimited: boolean
	transitionMs: number
	feedbackMs: number
	onNextPuzzle: () => void
	now?: () => number
}

export type PuzzleLifecycle = {
	getSnapshot: () => PuzzleLifecycleSnapshot
	/** Notifies on every later change. Returns an unsubscribe function. */
	subscribe: (
		listener: (snapshot: PuzzleLifecycleSnapshot) => void
	) => () => void
	/** Leaves the countdown. Returns false outside the countdown phase. */
	start: () => boolean
	/**
	 * Accepts one answer while answering. `evaluate` receives the attempt
	 * duration and returns whether the answer was correct. Returns false when
	 * the answer was rejected because no attempt is open.
	 */
	submitAttempt: (evaluate: (durationSeconds: number) => boolean) => boolean
	/** Cancels every pending timer. Idempotent. */
	end: () => void
}

export function createPuzzleLifecycle(
	options: PuzzleLifecycleOptions
): PuzzleLifecycle {
	const now = options.now ?? (() => performance.now())
	const pendingTimeouts = new Set<ReturnType<typeof setTimeout>>()
	const listeners = new Set<(snapshot: PuzzleLifecycleSnapshot) => void>()
	let phase: PuzzleLifecyclePhase = options.startsAnswering
		? 'answering'
		: 'countdown'
	let progressBarState: TimerState = TimerState.Initialized
	let quizTimeoutState: TimerState = TimerState.Initialized
	let attemptStartedAt: number | undefined = options.startsAnswering
		? now()
		: undefined

	function getSnapshot(): PuzzleLifecycleSnapshot {
		return { phase, progressBarState, quizTimeoutState }
	}

	function publish(): void {
		const snapshot = getSnapshot()
		for (const listener of listeners) listener(snapshot)
	}

	function schedule(callback: () => void, delayMs: number): void {
		const timeout = setTimeout(() => {
			pendingTimeouts.delete(timeout)
			callback()
		}, delayMs)
		pendingTimeouts.add(timeout)
	}

	// Timers render as Stopped during the tween so they stay visible, then
	// start together once the puzzle is on screen.
	function enterTransition(startsQuizTimer: boolean): void {
		phase = 'transition'
		attemptStartedAt = undefined
		progressBarState = TimerState.Stopped
		schedule(() => {
			phase = 'answering'
			attemptStartedAt = now()
			progressBarState = TimerState.Started
			if (startsQuizTimer) quizTimeoutState = TimerState.Started
			publish()
		}, options.transitionMs)
	}

	function advanceToNextPuzzle(): void {
		enterTransition(false)
		options.onNextPuzzle()
		publish()
	}

	return {
		getSnapshot,
		subscribe(listener) {
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
			}
		},
		start() {
			if (phase !== 'countdown') return false
			if (!options.isUnlimited) quizTimeoutState = TimerState.Stopped
			enterTransition(!options.isUnlimited)
			publish()
			return true
		},
		submitAttempt(evaluate) {
			if (phase !== 'answering' || attemptStartedAt === undefined) return false
			const durationSeconds = (now() - attemptStartedAt) / 1000
			phase = 'feedback'
			attemptStartedAt = undefined
			progressBarState = TimerState.Paused

			const isCorrect = evaluate(durationSeconds)
			// Read through getSnapshot: `evaluate` may have called end().
			if (getSnapshot().phase === 'ended') return true

			if (isCorrect) {
				advanceToNextPuzzle()
			} else {
				publish()
				schedule(advanceToNextPuzzle, options.feedbackMs)
			}
			return true
		},
		end() {
			if (phase === 'ended') return
			phase = 'ended'
			attemptStartedAt = undefined
			for (const timeout of pendingTimeouts) clearTimeout(timeout)
			pendingTimeouts.clear()
			publish()
		}
	}
}
