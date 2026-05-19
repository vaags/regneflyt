import { Operator } from '$lib/constants/Operator'
import {
	countCarriesOrBorrows,
	getPuzzleDifficulty
} from './adaptiveDifficultyScoring'
import type { PuzzlePartSet } from '$lib/models/Puzzle'

/**
 * Penalty constants for puzzle candidate evaluation.
 * Ordered by severity: out-of-window > repeat > unwanted carry.
 *
 * These values are chosen to ensure the evaluation function strongly prefers
 * in-window, non-repeat, carry-free puzzles while still allowing fallback
 * to higher-penalty candidates when necessary.
 */
export const OUT_OF_WINDOW_PENALTY = 2_000_000
export const REPEAT_PENALTY = 1_000_000
export const UNWANTED_CARRY_PENALTY = 100_000

/**
 * Result of evaluating a generated puzzle candidate.
 * Contains flags and metrics used to compute a candidate score.
 */
export interface DifficultyBoundsEvaluation {
	difficulty: number
	tooEasy: boolean
	tooHard: boolean
	difficultyShortfall: number
	difficultyOvershoot: number
}

/**
 * Evaluates a puzzle's difficulty relative to skill bounds.
 *
 * Difficulty is calculated using operator-specific models:
 * - Addition/Subtraction: Power curves with carry/borrow modifiers
 * - Multiplication/Division: Weighted blend of table hardness and factor difficulty
 *
 * See docs/ADAPTIVE_ALGORITHM.md#difficulty-scoring for details.
 *
 * @param operator - The operator used in the puzzle
 * @param parts - The generated puzzle parts [left, right, result]
 * @param minDifficulty - Minimum acceptable difficulty
 * @param maxDifficulty - Maximum acceptable difficulty
 * @returns Difficulty and bounds evaluation
 */
export function evaluateDifficultyBounds(
	operator: Operator,
	parts: PuzzlePartSet,
	minDifficulty: number,
	maxDifficulty: number
): DifficultyBoundsEvaluation {
	const difficulty = getPuzzleDifficulty(operator, parts)
	const difficultyShortfall = Math.max(0, minDifficulty - difficulty)
	const difficultyOvershoot = Math.max(0, difficulty - maxDifficulty)

	return {
		difficulty,
		tooEasy: difficultyShortfall > 0,
		tooHard: difficultyOvershoot > 0,
		difficultyShortfall,
		difficultyOvershoot
	}
}

/**
 * Determines if a candidate puzzle has unwanted carries or borrows.
 *
 * @param parts - The puzzle parts
 * @param operator - The operator (Addition or Subtraction)
 * @param preferNoCarry - Whether to avoid carries/borrows
 * @returns True if the puzzle has carries/borrows and avoidance is preferred
 */
export function hasUnwantedCarryOrBorrow(
	parts: PuzzlePartSet,
	operator: Operator,
	preferNoCarry: boolean
): boolean {
	if (!preferNoCarry) return false

	const carryCount = countCarriesOrBorrows(
		parts[0].generatedValue,
		parts[1].generatedValue,
		operator === Operator.Subtraction
	)

	return carryCount > 0
}
