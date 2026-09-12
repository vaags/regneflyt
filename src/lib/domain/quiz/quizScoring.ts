import type { Puzzle } from '#lib/domain/puzzle-generation/puzzle.ts'

export const regneflytThresholdSeconds = 3

export function hasRegneflytStar(
	puzzle: Pick<Puzzle, 'isCorrect' | 'duration'>
): boolean {
	return (
		puzzle.isCorrect === true && puzzle.duration <= regneflytThresholdSeconds
	)
}
