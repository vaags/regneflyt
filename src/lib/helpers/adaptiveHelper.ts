import { Operator } from '$lib/constants/Operator'
import { PuzzleMode } from '$lib/constants/PuzzleMode'
import { AppSettings, tablesByDifficulty } from '$lib/constants/AppSettings'
import type { PuzzlePartSet } from '$lib/models/Puzzle'
import {
	adaptiveDifficultyId,
	customDifficultyId,
	adaptiveTuning,
	type DifficultyMode,
	type AdaptiveSkillMap
} from '$lib/models/AdaptiveProfile'
import { type Rng, nextFloat } from './rng'
import { getUpdatedSkill, clampSkill } from './adaptiveSkillUpdate'
import {
	getDifficultyRatio,
	getPuzzleDifficulty
} from './adaptiveDifficultyScoring'

/**
 * Updates a skill map in place after a puzzle attempt.
 * Computes the intrinsic puzzle difficulty, compares it to the player's
 * current skill, and applies a gain or penalty accordingly.
 *
 * Skill updates are **multiplicative**, combining baseline gains with speed feedback,
 * difficulty calibration, endgame tapering, and streak bonuses. See
 * [docs/ADAPTIVE_ALGORITHM.md](../../docs/ADAPTIVE_ALGORITHM.md#skill-update-formula) for a detailed breakdown.
 *
 * @param skillMap - Mutable skill array indexed by {@link Operator}
 * @param operator - The operator used in the solved puzzle
 * @param parts - The generated puzzle parts (used to derive difficulty)
 * @param isCorrect - Whether the player answered correctly
 * @param durationSeconds - Time the player spent on the puzzle
 * @param consecutiveCorrect - Number of consecutive correct answers leading up to (and including) this one
 * @returns The new skill value for the given operator
 */
export function applySkillUpdate(
	skillMap: AdaptiveSkillMap,
	operator: Operator,
	parts: PuzzlePartSet,
	isCorrect: boolean,
	durationSeconds: number,
	consecutiveCorrect = 0
): number {
	const currentSkill = skillMap[operator]
	const difficulty = getPuzzleDifficulty(operator, parts)
	const ratio = getDifficultyRatio(difficulty, currentSkill)
	const newSkill = getUpdatedSkill(
		currentSkill,
		isCorrect,
		durationSeconds,
		ratio,
		consecutiveCorrect
	)
	skillMap[operator] = newSkill

	return newSkill
}

/**
 * Normalises a raw difficulty parameter to a valid {@link DifficultyMode}.
 * Returns custom mode if the param matches, otherwise defaults to adaptive.
 *
 * @param difficultyParam - Raw difficulty value from URL or UI
 * @returns A validated difficulty mode identifier
 */
export function normalizeDifficulty(
	difficultyParam: number | undefined
): DifficultyMode {
	if (difficultyParam === customDifficultyId) return customDifficultyId

	return adaptiveDifficultyId
}

/**
 * Returns whether the given difficulty resolves to adaptive mode.
 */
export function isAdaptiveDifficulty(
	difficultyParam: number | undefined
): boolean {
	return normalizeDifficulty(difficultyParam) === adaptiveDifficultyId
}

/**
 * Translates a skill value into concrete puzzle parameters.
 * For +/− this means a number range; for ×/÷ a set of unlocked tables.
 * In custom mode the user's chosen range/tables are used as-is;
 * in adaptive mode the system picks ranges from scratch.
 *
 * @param operator - Which arithmetic operator to configure
 * @param skill - Current skill level for this operator (0–100)
 * @param difficulty - Adaptive or custom difficulty mode
 * @param baseRange - User-configured number range (used in custom mode)
 * @param basePossibleValues - User-configured table values (used in custom mode)
 * @returns Object with `range` and `possibleValues` for puzzle generation
 */
export function getAdaptiveSettingsForOperator(
	operator: Operator,
	skill: number,
	difficulty: DifficultyMode,
	baseRange: [min: number, max: number],
	basePossibleValues: number[],
	cooldownStepsRemaining = 0,
	isAlgebraicForm = false
): {
	effectiveSkill: number
	range: [number, number]
	secondaryRange?: [number, number]
	possibleValues: number[]
} {
	const safeSkill =
		difficulty !== customDifficultyId && isAlgebraicForm
			? clampSkill(skill - adaptiveTuning.algebraicRollout.algebraicSkillOffset)
			: clampSkill(skill)

	if (operator === Operator.Addition || operator === Operator.Subtraction) {
		if (difficulty === customDifficultyId) {
			return {
				effectiveSkill: safeSkill,
				range: baseRange,
				possibleValues: []
			}
		}

		const [lowerBound, upperBound] = getAdaptiveRange(safeSkill, operator)
		const laggedSkill = Math.max(
			adaptiveTuning.skillBounds.minSkill,
			safeSkill -
				adaptiveTuning.additionSubtraction
					.additionSubtractionSecondOperandSkillLag
		)
		const [secondaryLowerBound, secondaryUpperBound] = getAdaptiveRange(
			laggedSkill,
			operator
		)
		const [minRange, maxRange] =
			operator === Operator.Addition
				? [AppSettings.additionMinRange, AppSettings.additionMaxRange]
				: [AppSettings.subtractionMinRange, AppSettings.subtractionMaxRange]

		const applyCooldown = (upper: number): number =>
			cooldownStepsRemaining > 0
				? Math.max(
						adaptiveTuning.additionSubtraction.additionSubtractionMinUpperBound,
						Math.round(
							upper *
								(1 - adaptiveTuning.penalties.incorrectCooldownRangeReduction)
						)
					)
				: upper

		const clampRange = (lower: number, upper: number): [number, number] => [
			Math.max(minRange, Math.min(lower, maxRange)),
			Math.max(minRange, Math.min(upper, maxRange))
		]

		return {
			effectiveSkill: safeSkill,
			range: clampRange(lowerBound, applyCooldown(upperBound)),
			secondaryRange: clampRange(
				secondaryLowerBound,
				applyCooldown(secondaryUpperBound)
			),
			possibleValues: []
		}
	}

	if (difficulty === customDifficultyId) {
		return {
			effectiveSkill: safeSkill,
			range: [
				adaptiveTuning.multiplicationDivision.mulDivFactorMin,
				adaptiveTuning.multiplicationDivision.mulDivFactorMax
			],
			possibleValues: basePossibleValues
		}
	}

	return {
		effectiveSkill: safeSkill,
		range: getAdaptiveFactorRange(safeSkill),
		possibleValues: getAdaptiveTables(safeSkill)
	}
}

/**
 * Picks a puzzle presentation mode based on skill using probability blending.
 * Normal dominates at low skill, Alternate fades in around the alternate midpoint,
 * and Random fades in around the random midpoint. Uses logistic curves so the
 * transitions are smooth — no abrupt switches.
 *
 * @param skill - Current skill level (0–100)
 * @returns The puzzle mode to use for the next puzzle
 */
export function getAdaptivePuzzleMode(rng: Rng, skill: number): PuzzleMode {
	const safeSkill = clampSkill(skill)
	const {
		adaptiveModeAlternateMidpoint,
		adaptiveModeRandomMidpoint,
		adaptiveModeSpread
	} = adaptiveTuning.puzzleMode

	// Logistic sigmoid: 0 → 1 as skill crosses the midpoint
	const sigmoid = (s: number, mid: number): number =>
		1 / (1 + Math.exp(-(s - mid) / (adaptiveModeSpread / 4)))

	// Probability of "at least Alternate" and "at least Random"
	const pAtLeastAlternate = sigmoid(safeSkill, adaptiveModeAlternateMidpoint)
	const pRandom = sigmoid(safeSkill, adaptiveModeRandomMidpoint)

	const roll = nextFloat(rng)

	if (roll < pRandom) return PuzzleMode.Random
	if (roll < pAtLeastAlternate) return PuzzleMode.Alternate
	return PuzzleMode.Normal
}

// Computes the addition/subtraction number range for adaptive mode.
// Power curve keeps low-skill ranges small and ramps aggressively at higher skill.
function getAdaptiveRange(skill: number, operator: Operator): [number, number] {
	const exponent =
		operator === Operator.Subtraction
			? adaptiveTuning.additionSubtraction.subtractionExponent
			: adaptiveTuning.additionSubtraction.additionExponent
	const normalized = skill / 100
	const curve = Math.pow(normalized, exponent)

	const upperBound = Math.max(
		adaptiveTuning.additionSubtraction.additionSubtractionMinUpperBound,
		Math.round(
			adaptiveTuning.additionSubtraction.additionSubtractionUpperBoundBase +
				curve *
					adaptiveTuning.additionSubtraction.additionSubtractionUpperBoundScale
		)
	)

	const lowerBound = Math.max(
		1,
		Math.round(
			upperBound *
				adaptiveTuning.additionSubtraction.additionSubtractionLowerBoundScale *
				normalized
		)
	)

	return [lowerBound, upperBound]
}

// Unlocks multiplication tables in difficulty order (easiest first).
// Also drops the easiest ones at higher skill so the active set stays challenging.
// Uses fractional unlock/drop weights near boundaries to avoid abrupt jumps.
function getAdaptiveTables(skill: number): number[] {
	const normalized = skill / 100
	const curve = Math.pow(
		normalized,
		adaptiveTuning.multiplicationDivision.adaptiveTablesExponent
	)
	const unlockedRaw = Math.max(
		adaptiveTuning.multiplicationDivision.adaptiveTablesBase,
		adaptiveTuning.multiplicationDivision.adaptiveTablesBase +
			adaptiveTuning.multiplicationDivision.adaptiveTablesScale * curve
	)
	const totalUnlocked = Math.min(
		tablesByDifficulty.length,
		Math.floor(unlockedRaw)
	)
	const unlockFraction = Math.min(1, Math.max(0, unlockedRaw - totalUnlocked))

	const dropRaw =
		unlockedRaw *
		adaptiveTuning.multiplicationDivision.adaptiveTablesDropScale *
		(skill / 100)
	const fullDropCount = Math.max(
		0,
		Math.min(totalUnlocked, Math.floor(dropRaw))
	)
	const dropFraction = Math.min(1, Math.max(0, dropRaw - fullDropCount))

	// Weighted pool for smoother transitions:
	// - next harder table fades in as unlockFraction grows
	// - boundary easiest table fades out as dropFraction grows
	const weightPrecision =
		adaptiveTuning.multiplicationDivision.adaptiveTablesWeightPrecision
	const weightedTables: number[] = []

	for (let i = 0; i < totalUnlocked; i++) {
		const table = tablesByDifficulty[i]
		if (table == null) continue

		if (i < fullDropCount) continue

		let weight = 1
		if (i === fullDropCount) {
			weight *= 1 - dropFraction
		}

		const repeats = Math.round(weight * weightPrecision)
		for (let r = 0; r < repeats; r++) {
			weightedTables.push(table)
		}
	}

	const nextTable = tablesByDifficulty[totalUnlocked]
	if (nextTable != null && unlockFraction > 0) {
		const repeats = Math.round(unlockFraction * weightPrecision)
		for (let r = 0; r < repeats; r++) {
			weightedTables.push(nextTable)
		}
	}

	if (weightedTables.length > 0) return weightedTables

	const fallbackCount = Math.max(
		1,
		Math.round(
			adaptiveTuning.multiplicationDivision.adaptiveTablesBase +
				adaptiveTuning.multiplicationDivision.adaptiveTablesScale * curve
		)
	)
	return tablesByDifficulty.slice(
		0,
		Math.min(fallbackCount, tablesByDifficulty.length)
	)
}

// Scales both the minimum and maximum factor for ×/÷ as skill increases.
// Low-skill players get a narrower factor range (fewer large factors);
// high-skill players don't get trivial ×1 or ×2 puzzles.
function getAdaptiveFactorRange(skill: number): [number, number] {
	const normalized = skill / 100
	const minFactor = Math.round(
		adaptiveTuning.multiplicationDivision.mulDivFactorMin +
			normalized *
				(adaptiveTuning.multiplicationDivision.mulDivFactorMinAtMaxSkill -
					adaptiveTuning.multiplicationDivision.mulDivFactorMin)
	)
	const maxFactor = Math.round(
		adaptiveTuning.multiplicationDivision.mulDivFactorMaxAtMinSkill +
			normalized *
				(adaptiveTuning.multiplicationDivision.mulDivFactorMax -
					adaptiveTuning.multiplicationDivision.mulDivFactorMaxAtMinSkill)
	)
	return [
		Math.max(adaptiveTuning.multiplicationDivision.mulDivFactorMin, minFactor),
		Math.min(
			adaptiveTuning.multiplicationDivision.mulDivFactorMax,
			Math.max(maxFactor, minFactor + 1)
		)
	]
}
