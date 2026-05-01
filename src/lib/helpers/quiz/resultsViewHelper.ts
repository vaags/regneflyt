import { AppSettings } from '$lib/constants/AppSettings'
import type { Puzzle } from '$lib/models/Puzzle'

export function formatPuzzleDurationSeconds(
	duration: number,
	locale: string
): string {
	return (Math.round(duration * 10) / 10).toLocaleString(locale)
}

export function hasRegneflytStar(
	puzzle: Pick<Puzzle, 'isCorrect' | 'duration'>
): boolean {
	return (
		puzzle.isCorrect === true &&
		puzzle.duration <= AppSettings.regneflytThresholdSeconds
	)
}
