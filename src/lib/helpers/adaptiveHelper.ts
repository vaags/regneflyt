import { Operator } from '$lib/constants/Operator'
import { PuzzleMode } from '$lib/constants/PuzzleMode'
import {
	AppSettings,
	factorDifficultyScores,
	factorShortcutTableDiscounts,
	maxFactorDifficultyScore,
	tablesByDifficulty,
	tableDifficultyScores
} from '$lib/constants/AppSettings'
import type { PuzzlePartSet } from '$lib/models/Puzzle'
import {
	adaptiveDifficultyId,
	customAdaptiveDifficultyId,
	defaultAdaptiveSkillMap,
	adaptiveTuning,
	type AdaptiveDifficulty,
	type AdaptiveSkillMap
} from '$lib/models/AdaptiveProfile'
import { type Rng, nextFloat } from './rng'

/**
 * Updates a skill map in place after a puzzle attempt.
 * Computes the intrinsic puzzle difficulty, compares it to the player's
 * current skill, and applies a gain or penalty accordingly.
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
	consecutiveCorrect: number = 0
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
 * Normalises a raw difficulty parameter to a valid {@link AdaptiveDifficulty}.
 * Returns custom-adaptive if the param matches, otherwise defaults to adaptive.
 *
 * @param difficultyParam - Raw difficulty value from URL or UI
 * @returns A validated difficulty mode identifier
 */
export function normalizeDifficulty(
	difficultyParam: number | undefined
): AdaptiveDifficulty {
	if (difficultyParam === customAdaptiveDifficultyId)
		return customAdaptiveDifficultyId

	return adaptiveDifficultyId
}

/**
 * Guards against corrupted or tampered localStorage data.
 * Returns a safe default if the shape is wrong, clamps each value otherwise.
 *
 * @param value - Raw value read from storage (unknown shape)
 * @returns A valid, clamped 4-element skill array
 */
export function sanitizeAdaptiveSkillMap(value: unknown): AdaptiveSkillMap {
	if (
		!Array.isArray(value) ||
		value.length !== adaptiveTuning.adaptiveAllOperatorCount
	)
		return [...defaultAdaptiveSkillMap] as AdaptiveSkillMap

	return Array.from(
		{ length: adaptiveTuning.adaptiveAllOperatorCount },
		(_, operator) => clampSkill(Number(value[operator]))
	) as AdaptiveSkillMap
}

/**
 * Clamps a skill value to the valid range [{@link adaptiveTuning.minSkill}, {@link adaptiveTuning.maxSkill}].
 * Non-finite values fall back to {@link adaptiveTuning.minSkill}.
 *
 * @param skill - Raw skill number to clamp
 * @returns Integer skill in the valid range
 */
export function clampSkill(skill: number): number {
	if (!Number.isFinite(skill)) return adaptiveTuning.minSkill

	return Math.max(
		adaptiveTuning.minSkill,
		Math.min(adaptiveTuning.maxSkill, Math.round(skill))
	)
}

/**
 * Core skill update — called after every puzzle answer.
 * Rewards speed on correct answers; penalises wrong answers more when slow.
 * A calibration boost accelerates early progress so beginners aren't bored.
 * {@link difficultyRatio} (0–1) scales gains so easy puzzles at high skill yield less.
 *
 * @param skill - Current skill level (0–100)
 * @param isCorrect - Whether the answer was correct
 * @param durationSeconds - Time spent answering
 * @param difficultyRatio - Ratio of puzzle difficulty to player skill (0–1)
 * @param consecutiveCorrect - Number of consecutive correct answers (for streak boost)
 * @returns Updated skill value, clamped to valid range
 */
export function getUpdatedSkill(
	skill: number,
	isCorrect: boolean,
	durationSeconds: number,
	difficultyRatio: number = 1,
	consecutiveCorrect: number = 0
) {
	const normalizedSkill = clampSkill(skill)

	// Scale max allowed time with skill level — harder puzzles deserve more time
	const effectiveMaxDuration =
		adaptiveTuning.maxDurationSeconds +
		(adaptiveTuning.maxDurationSecondsAtMaxSkill -
			adaptiveTuning.maxDurationSeconds) *
			(normalizedSkill / adaptiveTuning.maxSkill)

	if (!isCorrect) {
		const clampedDuration = Math.max(
			adaptiveTuning.minDurationSeconds,
			Math.min(effectiveMaxDuration, durationSeconds)
		)
		const slownessFactor = clampedDuration / effectiveMaxDuration
		const penalty = Math.round(
			adaptiveTuning.incorrectPenaltyBase +
				slownessFactor * adaptiveTuning.incorrectPenaltySlownessFactor
		)
		return clampSkill(normalizedSkill - penalty)
	}

	// Puzzles well below the player's level grant no skill
	if (difficultyRatio < adaptiveTuning.minDifficultyRatioForGain) {
		return normalizedSkill
	}

	const clampedDuration = Math.max(
		adaptiveTuning.minDurationSeconds,
		Math.min(effectiveMaxDuration, durationSeconds)
	)
	const speedFactor =
		(effectiveMaxDuration - clampedDuration) / effectiveMaxDuration
	// Scale the speed bonus with skill: answering easy puzzles fast
	// earns less than answering hard puzzles fast.
	const effectiveSpeedGain =
		normalizedSkill < adaptiveTuning.calibrationThreshold
			? adaptiveTuning.correctGainSpeedFactorAtMinSkill +
				(normalizedSkill / adaptiveTuning.calibrationThreshold) *
					(adaptiveTuning.correctGainSpeedFactor -
						adaptiveTuning.correctGainSpeedFactorAtMinSkill)
			: adaptiveTuning.correctGainSpeedFactor
	const baseDelta =
		adaptiveTuning.correctGainBase + speedFactor * effectiveSpeedGain
	const safeDifficultyRatio = Math.max(0, Math.min(1, difficultyRatio))
	const isFastEnoughForStreak =
		clampedDuration <=
		effectiveMaxDuration * adaptiveTuning.streakBoostMaxSpeedFraction
	const streakMultiplier =
		consecutiveCorrect >= adaptiveTuning.streakBoostThreshold &&
		isFastEnoughForStreak
			? adaptiveTuning.streakBoostMultiplier
			: 1
	const delta = Math.floor(
		baseDelta *
			getCalibrationBoost(normalizedSkill) *
			getHighSkillTaper(normalizedSkill) *
			safeDifficultyRatio *
			streakMultiplier
	)

	return clampSkill(normalizedSkill + delta)
}

// Linear boost that tapers to 1× at the calibration threshold.
// Prevents new players from grinding dozens of trivial puzzles before
// the difficulty catches up to their actual level.
function getCalibrationBoost(skill: number): number {
	const { calibrationThreshold, calibrationMaxBoost } = adaptiveTuning
	if (skill >= calibrationThreshold) return 1

	return (
		1 +
		((calibrationThreshold - skill) / calibrationThreshold) *
			(calibrationMaxBoost - 1)
	)
}

// Linear taper that reduces gain above the taper threshold.
// Makes the final stretch to max skill require sustained accuracy and speed.
function getHighSkillTaper(skill: number): number {
	const { taperThreshold, taperMinGain, maxSkill } = adaptiveTuning
	if (skill <= taperThreshold) return 1

	return (
		1 -
		((skill - taperThreshold) / (maxSkill - taperThreshold)) *
			(1 - taperMinGain)
	)
}

/**
 * Translates a skill value into concrete puzzle parameters.
 * For +/− this means a number range; for ×/÷ a set of unlocked tables.
 * In custom mode the user's chosen range/tables are narrowed by skill;
 * in adaptive mode the system picks ranges from scratch.
 *
 * @param operator - Which arithmetic operator to configure
 * @param skill - Current skill level for this operator (0–100)
 * @param difficulty - Adaptive or custom-adaptive mode
 * @param baseRange - User-configured number range (used in custom mode)
 * @param basePossibleValues - User-configured table values (used in custom mode)
 * @returns Object with `range` and `possibleValues` for puzzle generation
 */
export function getAdaptiveSettingsForOperator(
	operator: Operator,
	skill: number,
	difficulty: AdaptiveDifficulty,
	baseRange: [min: number, max: number],
	basePossibleValues: number[],
	cooldownStepsRemaining: number = 0
): {
	range: [number, number]
	secondaryRange?: [number, number]
	possibleValues: number[]
} {
	const safeSkill = clampSkill(skill)

	if (operator === Operator.Addition || operator === Operator.Subtraction) {
		if (difficulty === customAdaptiveDifficultyId) {
			return {
				range: baseRange,
				possibleValues: []
			}
		}

		const [lowerBound, upperBound] = getAdaptiveRange(safeSkill, operator)
		const laggedSkill = Math.max(
			adaptiveTuning.minSkill,
			safeSkill - adaptiveTuning.additionSubtractionSecondOperandSkillLag
		)
		const [secondaryLowerBound, secondaryUpperBound] = getAdaptiveRange(
			laggedSkill,
			operator
		)
		const [minRange, maxRange] =
			operator === Operator.Addition
				? [AppSettings.additionMinRange, AppSettings.additionMaxRange]
				: [AppSettings.subtractionMinRange, AppSettings.subtractionMaxRange]

		const applyCooldown = (upper: number) =>
			cooldownStepsRemaining > 0
				? Math.max(
						adaptiveTuning.additionSubtractionMinUpperBound,
						Math.round(
							upper * (1 - adaptiveTuning.incorrectCooldownRangeReduction)
						)
					)
				: upper

		const clampRange = (lower: number, upper: number): [number, number] => [
			Math.max(minRange, Math.min(lower, maxRange)),
			Math.max(minRange, Math.min(upper, maxRange))
		]

		return {
			range: clampRange(lowerBound, applyCooldown(upperBound)),
			secondaryRange: clampRange(
				secondaryLowerBound,
				applyCooldown(secondaryUpperBound)
			),
			possibleValues: []
		}
	}

	if (difficulty === customAdaptiveDifficultyId) {
		return {
			range: [adaptiveTuning.mulDivFactorMin, adaptiveTuning.mulDivFactorMax],
			possibleValues: basePossibleValues
		}
	}

	return {
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
	} = adaptiveTuning

	// Logistic sigmoid: 0 → 1 as skill crosses the midpoint
	const sigmoid = (s: number, mid: number) =>
		1 / (1 + Math.exp(-(s - mid) / (adaptiveModeSpread / 4)))

	// Probability of "at least Alternate" and "at least Random"
	const pAtLeastAlternate = sigmoid(safeSkill, adaptiveModeAlternateMidpoint)
	const pRandom = sigmoid(safeSkill, adaptiveModeRandomMidpoint)

	const roll = nextFloat(rng)

	if (roll < pRandom) return PuzzleMode.Random
	if (roll < pAtLeastAlternate) return PuzzleMode.Alternate
	return PuzzleMode.Normal
}

/**
 * Maps a solved puzzle to an intrinsic difficulty score on the 0–100 skill scale.
 * For +/− the difficulty grows with operand magnitude (inverse of the adaptive power curve).
 * For ×/÷ the difficulty combines the table's known hardness with the second factor.
 *
 * @param operator - The operator used in the puzzle
 * @param parts - The three generated puzzle parts [left, right, result]
 * @returns Difficulty score clamped to 0–100
 */
export function getPuzzleDifficulty(
	operator: Operator,
	parts: PuzzlePartSet
): number {
	if (operator === Operator.Addition || operator === Operator.Subtraction) {
		const exponent =
			operator === Operator.Subtraction
				? adaptiveTuning.subtractionExponent
				: adaptiveTuning.additionExponent
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
		const w = adaptiveTuning.addSubMinorOperandWeight
		const effectiveOperand = majorOperand * (1 - w) + minorOperand * w
		const scale =
			operator === Operator.Subtraction
				? adaptiveTuning.subDifficultyScale
				: adaptiveTuning.addDifficultyScale
		const normalized = Math.max(
			0,
			(effectiveOperand - adaptiveTuning.addSubDifficultyBase) / scale
		)
		const baseScore = 100 * Math.pow(normalized, 1 / exponent)
		const multiplier =
			carries > 0
				? 1 + carries * adaptiveTuning.addSubCarryBorrowBoost
				: 1 - adaptiveTuning.addSubNoCarryDiscount
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
			? adaptiveTuning.mulDivIdentityTableFactorMultiplier
			: 1
	const shortcutTableDiscount = factorShortcutTableDiscounts.get(factor) ?? 0
	const tableScale =
		(tableScore / adaptiveTuning.maxTableDifficultyScore) *
		(1 - shortcutTableDiscount)

	// Weighted combination: table hardness dominates, factor adds nuance.
	// Factor scores model mental shortcuts directly (for example ×10 is easier
	// than ×9 despite being numerically larger), and shortcut factors also
	// discount the table contribution because they change the nature of the task.
	// Identity-table puzzles reduce factor influence further because 1×n and n÷1
	// are conceptually simpler than the same factor paired with other tables.
	// The sub-linear exponent stretches mid-range scores so difficulty
	// tracks skill more closely despite the discrete table set.
	const raw =
		tableScale * adaptiveTuning.mulDivTableWeight +
		factorScale *
			adaptiveTuning.mulDivFactorWeight *
			identityTableFactorMultiplier

	return clampSkill(
		Math.round(100 * Math.pow(raw, adaptiveTuning.mulDivDifficultyExponent))
	)
}

/**
 * Computes a 0–1 ratio that scales skill gains based on how hard the puzzle
 * is relative to the player's current skill. Puzzles at or above skill level
 * yield full gains; easier puzzles yield proportionally less.
 *
 * @param puzzleDifficulty - Intrinsic difficulty of the puzzle (0–100)
 * @param skill - Current player skill (0–100)
 * @returns Ratio between 0 and 1
 */
export function getDifficultyRatio(
	puzzleDifficulty: number,
	skill: number
): number {
	const safeSkill = clampSkill(skill) + 1
	return Math.max(0, Math.min(1, (puzzleDifficulty + 1) / safeSkill))
}

// Computes the addition/subtraction number range for adaptive mode.
// Power curve keeps low-skill ranges small and ramps aggressively at higher skill.
function getAdaptiveRange(skill: number, operator: Operator): [number, number] {
	const exponent =
		operator === Operator.Subtraction
			? adaptiveTuning.subtractionExponent
			: adaptiveTuning.additionExponent
	const normalized = skill / 100
	const curve = Math.pow(normalized, exponent)

	const upperBound = Math.max(
		adaptiveTuning.additionSubtractionMinUpperBound,
		Math.round(
			adaptiveTuning.additionSubtractionUpperBoundBase +
				curve * adaptiveTuning.additionSubtractionUpperBoundScale
		)
	)

	const lowerBound = Math.max(
		1,
		Math.round(
			upperBound *
				adaptiveTuning.additionSubtractionLowerBoundScale *
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
	const curve = Math.pow(normalized, adaptiveTuning.adaptiveTablesExponent)
	const unlockedRaw = Math.max(
		adaptiveTuning.adaptiveTablesBase,
		adaptiveTuning.adaptiveTablesBase +
			adaptiveTuning.adaptiveTablesScale * curve
	)
	const totalUnlocked = Math.min(
		tablesByDifficulty.length,
		Math.floor(unlockedRaw)
	)
	const unlockFraction = Math.min(1, Math.max(0, unlockedRaw - totalUnlocked))

	const dropRaw =
		unlockedRaw * adaptiveTuning.adaptiveTablesDropScale * (skill / 100)
	const fullDropCount = Math.max(
		0,
		Math.min(totalUnlocked, Math.floor(dropRaw))
	)
	const dropFraction = Math.min(1, Math.max(0, dropRaw - fullDropCount))

	// Weighted pool for smoother transitions:
	// - next harder table fades in as unlockFraction grows
	// - boundary easiest table fades out as dropFraction grows
	const weightPrecision = adaptiveTuning.adaptiveTablesWeightPrecision
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
			adaptiveTuning.adaptiveTablesBase +
				adaptiveTuning.adaptiveTablesScale * curve
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
		adaptiveTuning.mulDivFactorMin +
			normalized *
				(adaptiveTuning.mulDivFactorMinAtMaxSkill -
					adaptiveTuning.mulDivFactorMin)
	)
	const maxFactor = Math.round(
		adaptiveTuning.mulDivFactorMaxAtMinSkill +
			normalized *
				(adaptiveTuning.mulDivFactorMax -
					adaptiveTuning.mulDivFactorMaxAtMinSkill)
	)
	return [
		Math.max(adaptiveTuning.mulDivFactorMin, minFactor),
		Math.min(adaptiveTuning.mulDivFactorMax, Math.max(maxFactor, minFactor + 1))
	]
}

// Counts the number of column-level carries (addition) or borrows (subtraction).
// Used to boost difficulty scoring for puzzles that require multi-step mental work.
function countCarriesOrBorrows(
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

// Strips trailing zeros from a number (e.g. 200 → 2, 30 → 3, 7 → 7).
// For no-carry puzzles, trailing zeros represent digit columns with no work,
// so stripping them gives a better measure of actual cognitive difficulty.
function stripTrailingZeros(n: number): number {
	n = Math.abs(n)
	if (n === 0) return 0
	while (n % 10 === 0) {
		n = Math.floor(n / 10)
	}
	return n
}

// Strips trailing-zero columns shared by both operands (e.g. 120 and 40 -> 12 and 4).
// This preserves the core digit pattern while removing pure place-value scaling.
function stripCommonTrailingZeros(a: number, b: number): [number, number] {
	a = Math.abs(a)
	b = Math.abs(b)
	while (a > 0 && b > 0 && a % 10 === 0 && b % 10 === 0) {
		a = Math.floor(a / 10)
		b = Math.floor(b / 10)
	}
	return [a, b]
}
