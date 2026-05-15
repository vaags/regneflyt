import type { Operator } from '$lib/constants/Operator'
import type { PuzzlePartSet } from '$lib/models/Puzzle'
import {
	OUT_OF_WINDOW_PENALTY,
	REPEAT_PENALTY,
	UNWANTED_CARRY_PENALTY,
	evaluateDifficultyBounds,
	hasUnwantedCarryOrBorrow,
	type DifficultyBoundsEvaluation
} from './difficultyScoring'

/**
 * Comprehensive evaluation of a puzzle candidate.
 * Combines difficulty bounds, repeat status, and carry preferences
 * into a single score for ranking candidates.
 */
export interface PuzzleCandidateEvaluation extends DifficultyBoundsEvaluation {
	isRepeat: boolean
	hasUnwantedCarry: boolean
}

/**
 * Evaluates a generated puzzle candidate against constraints.
 *
 * Checks:
 * - Difficulty bounds (min/max)
 * - Repeat history (exact match with recent puzzles)
 * - Unwanted carries/borrows (early addition/subtraction)
 *
 * @param parts - The generated puzzle parts
 * @param recentParts - Recent puzzle parts to check for repeats
 * @param operator - The operator used
 * @param minDifficulty - Minimum acceptable difficulty
 * @param maxDifficulty - Maximum acceptable difficulty
 * @param preferNoCarry - Whether to avoid carries/borrows
 * @returns Comprehensive evaluation for scoring
 */
export function evaluatePuzzleCandidate(
	parts: PuzzlePartSet,
	recentParts: PuzzlePartSet[],
	operator: Operator,
	minDifficulty: number,
	maxDifficulty: number,
	preferNoCarry = false
): PuzzleCandidateEvaluation {
	const boundsEval = evaluateDifficultyBounds(
		operator,
		parts,
		minDifficulty,
		maxDifficulty
	)

	const isRepeat = recentParts.some((recent) => isSamePuzzle(parts, recent))
	const carryPref = hasUnwantedCarryOrBorrow(parts, operator, preferNoCarry)

	return {
		difficulty: boundsEval.difficulty,
		tooEasy: boundsEval.tooEasy,
		tooHard: boundsEval.tooHard,
		difficultyShortfall: boundsEval.difficultyShortfall,
		difficultyOvershoot: boundsEval.difficultyOvershoot,
		isRepeat,
		hasUnwantedCarry: carryPref
	}
}

/**
 * Computes a numeric score for a puzzle candidate.
 *
 * Lower scores are better. The scoring hierarchy enforces:
 * 1. Out-of-window puzzles heavily penalized if bounds are prioritized
 * 2. Repeat puzzles heavily penalized (prevent learner boredom)
 * 3. Unwanted carries/borrows moderately penalized
 * 4. Continuous penalty for difficulty overshoot/undershoot
 *
 * This ensures the puzzle generator selects appropriate candidates
 * while gracefully degrading when perfect matches are unavailable.
 *
 * @param evaluation - Result of evaluatePuzzleCandidate()
 * @param prioritizeDifficultyWindow - Whether to heavily penalize out-of-window puzzles
 * @returns Numeric score (lower is better)
 */
export function getCandidateScore(
	evaluation: PuzzleCandidateEvaluation,
	prioritizeDifficultyWindow = false
): number {
	// Apply penalty hierarchy explicitly for clarity.
	// See docs/ADAPTIVE_ALGORITHM.md#puzzle-generation--repeat-prevention for details.

	// Out-of-window penalty: applies only if bounds prioritization is active AND puzzle is outside bounds
	const outOfWindowPenalty =
		prioritizeDifficultyWindow &&
		(evaluation.difficultyShortfall > 0 || evaluation.difficultyOvershoot > 0)
			? OUT_OF_WINDOW_PENALTY
			: 0

	// Repeat penalty: prevents reusing recent puzzles
	const repeatPenalty = evaluation.isRepeat ? REPEAT_PENALTY : 0

	// Unwanted carry penalty: applies when carry/borrow avoidance is preferred (early arithmetic)
	const carryPenalty = evaluation.hasUnwantedCarry ? UNWANTED_CARRY_PENALTY : 0

	// Continuous penalty: proportional to how far outside the window the puzzle falls
	const continuousPenalty =
		evaluation.difficultyShortfall + evaluation.difficultyOvershoot

	return outOfWindowPenalty + repeatPenalty + carryPenalty + continuousPenalty
}

/**
 * Determines if two puzzle part sets represent the same puzzle.
 *
 * @param a - First puzzle parts
 * @param b - Second puzzle parts
 * @returns True if all parts are identical
 */
function isSamePuzzle(a: PuzzlePartSet, b: PuzzlePartSet): boolean {
	return (
		a[0].generatedValue === b[0].generatedValue &&
		a[1].generatedValue === b[1].generatedValue &&
		a[2].generatedValue === b[2].generatedValue
	)
}
