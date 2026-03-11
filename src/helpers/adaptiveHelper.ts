import { Operator } from '../models/constants/Operator'
import { PuzzleMode } from '../models/constants/PuzzleMode'
import {
	AppSettings,
	tablesByDifficulty,
	tableDifficultyScores
} from '../models/constants/AppSettings'
import type { PuzzlePartSet } from '../models/Puzzle'
import {
	adaptiveDifficultyId,
	customAdaptiveDifficultyId,
	defaultAdaptiveSkillMap,
	adaptiveTuning,
	type AdaptiveDifficulty,
	type AdaptiveSkillMap
} from '../models/AdaptiveProfile'

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
 * @returns The new skill value for the given operator
 */
export function applySkillUpdate(
	skillMap: AdaptiveSkillMap,
	operator: Operator,
	parts: PuzzlePartSet,
	isCorrect: boolean,
	durationSeconds: number
): number {
	const currentSkill = skillMap[operator]
	const difficulty = getPuzzleDifficulty(operator, parts)
	const ratio = getDifficultyRatio(difficulty, currentSkill)
	const newSkill = getUpdatedSkill(
		currentSkill,
		isCorrect,
		durationSeconds,
		ratio
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
 * @returns Updated skill value, clamped to valid range
 */
export function getUpdatedSkill(
	skill: number,
	isCorrect: boolean,
	durationSeconds: number,
	difficultyRatio: number = 1
) {
	const normalizedSkill = clampSkill(skill)

	if (!isCorrect) {
		const clampedDuration = Math.max(
			adaptiveTuning.minDurationSeconds,
			Math.min(adaptiveTuning.maxDurationSeconds, durationSeconds)
		)
		const slownessFactor = clampedDuration / adaptiveTuning.maxDurationSeconds
		const penalty = Math.round(
			adaptiveTuning.incorrectPenaltyBase +
				slownessFactor * adaptiveTuning.incorrectPenaltySlownessFactor
		)
		return clampSkill(normalizedSkill - penalty)
	}

	const clampedDuration = Math.max(
		adaptiveTuning.minDurationSeconds,
		Math.min(adaptiveTuning.maxDurationSeconds, durationSeconds)
	)
	const speedFactor =
		(adaptiveTuning.maxDurationSeconds - clampedDuration) /
		adaptiveTuning.maxDurationSeconds
	const baseDelta =
		adaptiveTuning.correctGainBase +
		speedFactor * adaptiveTuning.correctGainSpeedFactor
	const safeDifficultyRatio = Math.max(0, Math.min(1, difficultyRatio))
	const delta = Math.floor(
		baseDelta *
			getCalibrationBoost(normalizedSkill) *
			getHighSkillTaper(normalizedSkill) *
			safeDifficultyRatio
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
	basePossibleValues: number[]
): {
	range: [number, number]
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

		const [lowerBound, upperBound] = getAdaptiveRange(safeSkill)
		const [minRange, maxRange] =
			operator === Operator.Addition
				? [AppSettings.additionMinRange, AppSettings.additionMaxRange]
				: [AppSettings.subtractionMinRange, AppSettings.subtractionMaxRange]

		return {
			range: [
				Math.max(minRange, Math.min(lowerBound, maxRange)),
				Math.max(minRange, Math.min(upperBound, maxRange))
			],
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
 * Decides how the puzzle is presented based on skill.
 * Normal: a + b = ? → Alternate: a + ? = c → Random: ? + b = c.
 * Uses hysteresis so the mode doesn't flicker when skill hovers near a threshold.
 *
 * @param skill - Current skill level (0–100)
 * @param currentMode - The puzzle mode used for the previous puzzle
 * @returns The puzzle mode to use for the next puzzle
 */
export function getAdaptivePuzzleMode(
	skill: number,
	currentMode: PuzzleMode = PuzzleMode.Normal
): PuzzleMode {
	const safeSkill = clampSkill(skill)
	const alternateThreshold = adaptiveTuning.adaptiveModeAlternateThreshold
	const randomThreshold = adaptiveTuning.adaptiveModeRandomThreshold
	const hysteresis = adaptiveTuning.adaptiveModeHysteresis

	switch (currentMode) {
		case PuzzleMode.Random:
			return safeSkill < randomThreshold - hysteresis
				? PuzzleMode.Alternate
				: PuzzleMode.Random
		case PuzzleMode.Alternate:
			if (safeSkill >= randomThreshold + hysteresis) return PuzzleMode.Random
			if (safeSkill < alternateThreshold - hysteresis) return PuzzleMode.Normal
			return PuzzleMode.Alternate
		case PuzzleMode.Normal:
		default:
			return safeSkill >= alternateThreshold + hysteresis
				? PuzzleMode.Alternate
				: PuzzleMode.Normal
	}
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
		const maxOperand = Math.max(
			Math.abs(parts[0].generatedValue),
			Math.abs(parts[1].generatedValue)
		)
		const scale =
			operator === Operator.Subtraction
				? adaptiveTuning.subDifficultyScale
				: adaptiveTuning.addDifficultyScale
		const normalized = Math.max(
			0,
			(maxOperand - adaptiveTuning.addSubDifficultyBase) / scale
		)
		return clampSkill(
			Math.round(
				100 * Math.pow(normalized, 1 / adaptiveTuning.addSubDifficultyExponent)
			)
		)
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
	const factorScale = Math.max(0, Math.min(1, factor / 10))

	// Weighted combination: table hardness dominates, factor adds nuance
	const raw =
		(tableScore / adaptiveTuning.maxTableDifficultyScore) *
			adaptiveTuning.mulDivTableWeight +
		factorScale * adaptiveTuning.mulDivFactorWeight

	return clampSkill(Math.round(raw * 100))
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
function getAdaptiveRange(skill: number): [number, number] {
	const normalized = skill / 100
	const curve = Math.pow(
		normalized,
		adaptiveTuning.additionSubtractionUpperBoundExponent
	)

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
function getAdaptiveTables(skill: number): number[] {
	const count = Math.max(
		adaptiveTuning.adaptiveTablesBase,
		Math.round(
			adaptiveTuning.adaptiveTablesBase +
				(adaptiveTuning.adaptiveTablesScale * skill) / 100
		)
	)
	const totalUnlocked = Math.min(count, tablesByDifficulty.length)
	const dropCount = Math.floor(
		totalUnlocked * adaptiveTuning.adaptiveTablesDropScale * (skill / 100)
	)
	return tablesByDifficulty.slice(dropCount, totalUnlocked)
}

// Raises the minimum factor for ×/÷ as skill increases,
// so high-skill players don't get trivial ×1 or ×2 puzzles.
function getAdaptiveFactorRange(skill: number): [number, number] {
	const normalized = skill / 100
	const minFactor = Math.round(
		adaptiveTuning.mulDivFactorMin +
			normalized *
				(adaptiveTuning.mulDivFactorMinAtMaxSkill -
					adaptiveTuning.mulDivFactorMin)
	)
	return [
		Math.max(adaptiveTuning.mulDivFactorMin, minFactor),
		adaptiveTuning.mulDivFactorMax
	]
}
