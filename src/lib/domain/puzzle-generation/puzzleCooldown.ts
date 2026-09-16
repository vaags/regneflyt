import type { Operator } from '#lib/domain/arithmetic/operator.ts'
import type { Puzzle } from '#lib/domain/puzzle-generation/puzzle.ts'

export function getCooldownStepsRemaining(
	recentPuzzles: Puzzle[],
	operator: Operator,
	cooldownSteps: number
): number {
	let sameOperatorSinceIncorrect = 0
	for (let index = recentPuzzles.length - 1; index >= 0; index -= 1) {
		const puzzle = recentPuzzles[index]
		if (puzzle === undefined) {
			throw new Error('Expected puzzle at valid index')
		}
		if (puzzle.operator !== operator) continue
		if (puzzle.isCorrect === false) {
			return Math.max(0, cooldownSteps - sameOperatorSinceIncorrect)
		}
		sameOperatorSinceIncorrect += 1
	}
	return 0
}
