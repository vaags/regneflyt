import { TimerState } from '#lib/constants/TimerState.ts'
import type { Puzzle } from '#lib/domain/puzzle-generation/puzzle.ts'

export function trimRecentPuzzleHistory(
	recentPuzzles: Puzzle[],
	nextPuzzle: Puzzle,
	maxHistorySize: number
): Puzzle[] {
	return [...recentPuzzles, nextPuzzle].slice(-maxHistorySize)
}

export function shouldResumeQuizTimerAfterTween(
	quizTimeoutState: TimerState
): boolean {
	return (
		quizTimeoutState === TimerState.Stopped ||
		quizTimeoutState === TimerState.Finished
	)
}

export function hasMissingPuzzleInput(puzzle: Puzzle): boolean {
	const value = puzzle.parts[puzzle.unknownPartIndex].userDefinedValue
	return value === undefined || Object.is(value, -0)
}
