import { Operator } from '$lib/constants/Operator'
import {
	AppSettings,
	factorDifficultyScores,
	factorShortcutTableDiscounts,
	maxFactorDifficultyScore,
	tableDifficultyScores
} from '$lib/constants/AppSettings'
import type { PuzzlePartSet } from '$lib/models/Puzzle'
import { adaptiveTuning } from '$lib/models/AdaptiveProfile'
import { clampSkill } from './adaptiveSkillUpdate'

/**
 * Maps a solved puzzle to an intrinsic difficulty score on the 0-100 skill scale.
 * For +/- the difficulty grows with operand magnitude (inverse of the adaptive power curve).
 * For x/div the difficulty combines the table's known hardness with the second factor.
 *
 * @param operator - The operator used in the puzzle
 * @param parts - The three generated puzzle parts [left, right, result]
 * @returns Difficulty score clamped to 0-100
 */
export function getPuzzleDifficulty(
	operator: Operator,
	parts: PuzzlePartSet
): number {
	if (operator === Operator.Addition || operator === Operator.Subtraction) {
		const exponent =
			operator === Operator.Subtraction
				? adaptiveTuning.additionSubtraction.subtractionExponent
				: adaptiveTuning.additionSubtraction.additionExponent
		const absA = Math.abs(parts[0].generatedValue)
		const absB = Math.abs(parts[1].generatedValue)
		const carries = countCarriesOrBorrows(
			parts[0].generatedValue,
			parts[1].generatedValue,
			operator === Operator.Subtraction
		)
		// Strip shared trailing-zero columns first. They represent place-value
		// scaling of the same core operation (for example 90+10 mirrors 9+1).
		const [baseA, baseB] = stripCommonTrailingZeros(absA, absB)
		// For no-carry puzzles, strip trailing zeros from operands before
		// computing the effective operand. Trailing zeros represent digit
		// columns with no work (20+8 is cognitively the same as 2+8).
		const effA = carries === 0 ? stripTrailingZeros(baseA) : baseA
		const effB = carries === 0 ? stripTrailingZeros(baseB) : baseB
		const majorOperand = Math.max(effA, effB)
		const minorOperand = Math.min(effA, effB)
		const w = adaptiveTuning.difficultyScoring.addSubMinorOperandWeight
		const effectiveOperand = majorOperand * (1 - w) + minorOperand * w
		const scale =
			operator === Operator.Subtraction
				? adaptiveTuning.difficultyScoring.subDifficultyScale
				: adaptiveTuning.difficultyScoring.addDifficultyScale
		const normalized = Math.max(
			0,
			(effectiveOperand -
				adaptiveTuning.difficultyScoring.addSubDifficultyBase) /
				scale
		)
		const baseScore = 100 * Math.pow(normalized, 1 / exponent)
		const multiplier =
			carries > 0
				? 1 + carries * adaptiveTuning.difficultyScoring.addSubCarryBorrowBoost
				: 1 - adaptiveTuning.difficultyScoring.addSubNoCarryDiscount
		const adjusted = baseScore * multiplier
		return clampSkill(Math.round(adjusted))
	}

	// Multiplication / Division
	const table =
		operator === Operator.Multiplication
			? parts[0].generatedValue
			: parts[1].generatedValue
	const factor =
		operator === Operator.Multiplication
			? parts[1].generatedValue
			: parts[2].generatedValue

	const tableScore = tableDifficultyScores.get(table) ?? 0
	const factorScore = factorDifficultyScores.get(factor) ?? 0
	const factorScale = factorScore / maxFactorDifficultyScore
	const identityTableFactorMultiplier =
		table === AppSettings.minTable
			? adaptiveTuning.difficultyScoring.mulDivIdentityTableFactorMultiplier
			: 1
	const shortcutTableDiscount = factorShortcutTableDiscounts.get(factor) ?? 0
	const tableScale =
		(tableScore / adaptiveTuning.difficultyScoring.maxTableDifficultyScore) *
		(1 - shortcutTableDiscount)

	// Weighted combination: table hardness dominates, factor adds nuance.
	// Factor scores model mental shortcuts directly (for example x10 is easier
	// than x9 despite being numerically larger), and shortcut factors also
	// discount the table contribution because they change the nature of the task.
	// Identity-table puzzles reduce factor influence further because 1xn and n/1
	// are conceptually simpler than the same factor paired with other tables.
	// The sub-linear exponent stretches mid-range scores so difficulty
	// tracks skill more closely despite the discrete table set.
	const raw =
		tableScale * adaptiveTuning.difficultyScoring.mulDivTableWeight +
		factorScale *
			adaptiveTuning.difficultyScoring.mulDivFactorWeight *
			identityTableFactorMultiplier

	return clampSkill(
		Math.round(
			100 *
				Math.pow(raw, adaptiveTuning.difficultyScoring.mulDivDifficultyExponent)
		)
	)
}

/**
 * Computes a 0-1 ratio that scales skill gains based on how hard the puzzle
 * is relative to the player's current skill. Puzzles at or above skill level
 * yield full gains; easier puzzles yield proportionally less.
 *
 * @param puzzleDifficulty - Intrinsic difficulty of the puzzle (0-100)
 * @param skill - Current player skill (0-100)
 * @returns Ratio between 0 and 1
 */
export function getDifficultyRatio(
	puzzleDifficulty: number,
	skill: number
): number {
	const safeSkill = clampSkill(skill) + 1
	return Math.max(0, Math.min(1, (puzzleDifficulty + 1) / safeSkill))
}

// Counts the number of column-level carries (addition) or borrows (subtraction).
// Used to boost difficulty scoring for puzzles that require multi-step mental work.
export function countCarriesOrBorrows(
	a: number,
	b: number,
	isSubtraction: boolean
): number {
	let x = Math.abs(a)
	let y = Math.abs(b)
	let count = 0

	if (isSubtraction) {
		if (x < y) [x, y] = [y, x]
		while (x > 0 || y > 0) {
			if (x % 10 < y % 10) count++
			x = Math.floor(x / 10)
			y = Math.floor(y / 10)
		}
	} else {
		while (x > 0 || y > 0) {
			if ((x % 10) + (y % 10) >= 10) count++
			x = Math.floor(x / 10)
			y = Math.floor(y / 10)
		}
	}

	return count
}

// Strips trailing zeros from a number (e.g. 200 -> 2, 30 -> 3, 7 -> 7).
// For no-carry puzzles, trailing zeros represent digit columns with no work,
// so stripping them gives a better measure of actual cognitive difficulty.
function stripTrailingZeros(n: number): number {
	let value = Math.abs(n)
	if (value === 0) return 0
	while (value % 10 === 0) {
		value = Math.floor(value / 10)
	}
	return value
}

// Strips trailing-zero columns shared by both operands (e.g. 120 and 40 -> 12 and 4).
// This preserves the core digit pattern while removing pure place-value scaling.
function stripCommonTrailingZeros(a: number, b: number): [number, number] {
	let left = Math.abs(a)
	let right = Math.abs(b)
	while (left > 0 && right > 0 && left % 10 === 0 && right % 10 === 0) {
		left = Math.floor(left / 10)
		right = Math.floor(right / 10)
	}
	return [left, right]
}
