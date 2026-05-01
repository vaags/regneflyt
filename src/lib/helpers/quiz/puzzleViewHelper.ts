import { TimerState } from '$lib/constants/TimerState'
import type { Puzzle } from '$lib/models/Puzzle'

export function resetPuzzleParts(parts: Puzzle['parts']): Puzzle['parts'] {
	// A puzzle always has exactly 3 parts (left, right, result); preserve shape and clear user input.
	return [
		{ ...parts[0], userDefinedValue: undefined },
		{ ...parts[1], userDefinedValue: undefined },
		{ ...parts[2], userDefinedValue: undefined }
	]
}

export function resetReplayPuzzle(source: Puzzle): Puzzle {
	return {
		...source,
		parts: resetPuzzleParts(source.parts),
		duration: 0,
		isCorrect: undefined
	}
}

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
