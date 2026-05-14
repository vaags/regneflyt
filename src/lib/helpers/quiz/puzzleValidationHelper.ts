import type { Puzzle } from '$lib/models/Puzzle'
import { adaptiveTuning } from '$lib/models/AdaptiveProfile'

/**
 * Determines whether a puzzle answer is correct based on validation mode.
 *
 * In exact mode, the answer must match the exact value.
 * In estimation mode, the answer is correct if within ±tolerance% of the exact value.
 * Special case: if the exact answer is 0, only 0 is accepted in estimation mode too.
 *
 * @param puzzle - The puzzle with user-defined and generated values
 * @param estimationMode - Whether to use estimation tolerance or require exact match
 * @returns Whether the answer is correct
 */
export function isPuzzleAnswerCorrect(
	puzzle: Puzzle,
	estimationMode = false
): boolean {
	const unknownPart = puzzle.parts[puzzle.unknownPartIndex]

	const userAnswer = unknownPart.userDefinedValue
	const exactAnswer = unknownPart.generatedValue

	if (userAnswer === undefined) {
		return false
	}

	if (!estimationMode) {
		return userAnswer === exactAnswer
	}

	// Estimation mode: accept answers within ±tolerance%
	// Special case: if exact answer is 0, only 0 is acceptable
	if (exactAnswer === 0) {
		return userAnswer === 0
	}

	const tolerance = Math.max(
		adaptiveTuning.estimationMinAbsoluteTolerance,
		Math.abs(exactAnswer) * adaptiveTuning.estimationTolerance
	)
	return Math.abs(userAnswer - exactAnswer) <= tolerance
}
