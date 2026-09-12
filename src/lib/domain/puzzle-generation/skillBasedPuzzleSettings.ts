import { Operator, isAddSubOperator } from '#lib/domain/arithmetic/operator.ts'
import { PuzzleMode } from '#lib/domain/puzzle-generation/puzzleMode.ts'
import {
	tablesByDifficulty,
	puzzleGenerationSettings
} from '#lib/domain/puzzle-generation/puzzleGenerationSettings.ts'
import {
	customDifficultyId,
	type DifficultyMode
} from '../skill-progression/difficultyMode.ts'
import { getActiveTuning } from '../skill-progression/adaptiveTuning.ts'
import { type Rng, nextFloat } from '#lib/domain/puzzle-generation/random.ts'
import { clampSkill } from '../skill-progression/skillUpdate.ts'
import {
	progressionInternals,
	type OperandRange
} from '../skill-progression/skillModel.ts'

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
export function resolveOperatorPuzzleSettings(
	operator: Operator,
	skill: number,
	difficulty: DifficultyMode,
	baseRange: OperandRange,
	basePossibleValues: number[],
	cooldownStepsRemaining = 0,
	isAlgebraicForm = false
): ResolvedOperatorPuzzleSettings {
	const t = getActiveTuning()
	const safeSkill =
		difficulty !== customDifficultyId && isAlgebraicForm
			? clampSkill(skill - t.algebraicRollout.algebraicSkillOffset)
			: clampSkill(skill)

	if (isAddSubOperator(operator)) {
		return getAddSubSettings(
			operator,
			safeSkill,
			difficulty,
			baseRange,
			cooldownStepsRemaining
		)
	}

	return getMulDivSettings(safeSkill, difficulty, basePossibleValues)
}

/** Concrete puzzle parameters derived from a player's skill. */
interface ResolvedOperatorPuzzleSettings {
	effectiveSkill: number
	range: OperandRange
	secondaryRange?: OperandRange
	possibleValues: number[]
}

// Resolves range settings for addition/subtraction.
// Custom mode passes the user's range through; adaptive mode derives a primary
// and a (slightly lagged) secondary range, optionally narrowed during cooldown.
function getAddSubSettings(
	operator: Operator,
	safeSkill: number,
	difficulty: DifficultyMode,
	baseRange: OperandRange,
	cooldownStepsRemaining: number
): ResolvedOperatorPuzzleSettings {
	if (difficulty === customDifficultyId) {
		return {
			effectiveSkill: safeSkill,
			range: baseRange,
			possibleValues: []
		}
	}

	const t = getActiveTuning()
	const [lowerBound, upperBound] = getAdaptiveRange(safeSkill)
	const laggedSkill = Math.max(
		t.skillBounds.minSkill,
		safeSkill - t.additionSubtraction.secondOperandSkillLag
	)
	const [secondaryLowerBound, secondaryUpperBound] =
		getAdaptiveRange(laggedSkill)
	const [minRange, maxRange] =
		operator === Operator.Addition
			? [
					puzzleGenerationSettings.additionMinRange,
					puzzleGenerationSettings.additionMaxRange
				]
			: [
					puzzleGenerationSettings.subtractionMinRange,
					puzzleGenerationSettings.subtractionMaxRange
				]

	const applyCooldown = (upper: number): number =>
		cooldownStepsRemaining > 0
			? Math.max(
					t.additionSubtraction.rangeBase,
					Math.round(upper * (1 - t.penalties.cooldownRangeReduction))
				)
			: upper

	const clampRange = (lower: number, upper: number): OperandRange => [
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

// Resolves factor range and unlocked tables for multiplication/division.
// Custom mode keeps the user's chosen tables; adaptive mode derives both the
// factor range and the active table set from skill.
function getMulDivSettings(
	safeSkill: number,
	difficulty: DifficultyMode,
	basePossibleValues: number[]
): ResolvedOperatorPuzzleSettings {
	const t = getActiveTuning()
	if (difficulty === customDifficultyId) {
		return {
			effectiveSkill: safeSkill,
			range: [
				t.multiplicationDivision.factorMin,
				t.multiplicationDivision.factorMax
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
	const t = getActiveTuning()
	const safeSkill = clampSkill(skill)
	const { alternateMidpoint, randomMidpoint, transitionSpread } = t.puzzleMode

	// Logistic sigmoid: 0 → 1 as skill crosses the midpoint
	const sigmoid = (s: number, mid: number): number =>
		1 / (1 + Math.exp(-(s - mid) / (transitionSpread / 4)))

	// Probability of "at least Alternate" and "at least Random"
	const pAtLeastAlternate = sigmoid(safeSkill, alternateMidpoint)
	const pRandom = sigmoid(safeSkill, randomMidpoint)

	const roll = nextFloat(rng)

	if (roll < pRandom) return PuzzleMode.Random
	if (roll < pAtLeastAlternate) return PuzzleMode.Alternate
	return PuzzleMode.Normal
}

// Computes the addition/subtraction number range for adaptive mode.
// Power curve keeps low-skill ranges small and ramps aggressively at higher skill.
function getAdaptiveRange(skill: number): OperandRange {
	const t = getActiveTuning()
	const exponent = t.additionSubtraction.addSubExponent
	const normalized = skill / 100
	const curve = Math.pow(normalized, exponent)

	const upperBound = Math.max(
		t.additionSubtraction.rangeBase,
		Math.round(
			t.additionSubtraction.rangeBase + curve * t.additionSubtraction.rangeScale
		)
	)

	const lowerBound = Math.max(
		1,
		Math.round(upperBound * t.additionSubtraction.lowerBoundScale * normalized)
	)

	return [lowerBound, upperBound]
}

// Unlocks multiplication tables in difficulty order (easiest first).
// Also drops the easiest ones at higher skill so the active set stays challenging.
// Uses fractional unlock/drop weights near boundaries to avoid abrupt jumps.
function getAdaptiveTables(skill: number): number[] {
	const t = getActiveTuning()
	const normalized = skill / 100
	const curve = Math.pow(normalized, t.multiplicationDivision.tablesExponent)
	const unlockedRaw = Math.max(
		t.multiplicationDivision.tablesBase,
		t.multiplicationDivision.tablesBase +
			t.multiplicationDivision.tablesScale * curve
	)
	const totalUnlocked = Math.min(
		tablesByDifficulty.length,
		Math.floor(unlockedRaw)
	)
	const unlockFraction = Math.min(1, Math.max(0, unlockedRaw - totalUnlocked))

	const dropRaw =
		unlockedRaw * t.multiplicationDivision.tablesDropScale * (skill / 100)
	const fullDropCount = Math.max(
		0,
		Math.min(totalUnlocked, Math.floor(dropRaw))
	)
	const dropFraction = Math.min(1, Math.max(0, dropRaw - fullDropCount))

	// Weighted pool for smoother transitions:
	// - next harder table fades in as unlockFraction grows
	// - boundary easiest table fades out as dropFraction grows
	const weightPrecision = progressionInternals.tablesWeightPrecision
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
			t.multiplicationDivision.tablesBase +
				t.multiplicationDivision.tablesScale * curve
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
function getAdaptiveFactorRange(skill: number): OperandRange {
	const t = getActiveTuning()
	const normalized = skill / 100
	const minFactor = Math.round(
		t.multiplicationDivision.factorMin +
			normalized *
				(t.multiplicationDivision.factorMinAtMaxSkill -
					t.multiplicationDivision.factorMin)
	)
	const maxFactor = Math.round(
		t.multiplicationDivision.factorMaxAtMinSkill +
			normalized *
				(t.multiplicationDivision.factorMax -
					t.multiplicationDivision.factorMaxAtMinSkill)
	)
	return [
		Math.max(t.multiplicationDivision.factorMin, minFactor),
		Math.min(
			t.multiplicationDivision.factorMax,
			Math.max(maxFactor, minFactor + 1)
		)
	]
}
