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

export function normalizeDifficulty(
	difficultyParam: number | undefined
): AdaptiveDifficulty {
	if (difficultyParam === customAdaptiveDifficultyId)
		return customAdaptiveDifficultyId

	return adaptiveDifficultyId
}

// Guards against corrupted or tampered localStorage data.
// Returns a safe default if the shape is wrong, clamps each value otherwise.
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

export function clampSkill(skill: number): number {
	if (!Number.isFinite(skill)) return adaptiveTuning.minSkill

	return Math.max(
		adaptiveTuning.minSkill,
		Math.min(adaptiveTuning.maxSkill, Math.round(skill))
	)
}

// Core skill update — called after every puzzle answer.
// Rewards speed on correct answers; penalises wrong answers more when slow.
// A calibration boost accelerates early progress so beginners aren't bored.
// difficultyRatio (0–1) scales gains so easy puzzles at high skill yield less.
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
	const scaledDelta = Math.floor(
		baseDelta *
			getCalibrationBoost(normalizedSkill) *
			getHighSkillTaper(normalizedSkill)
	)
	const delta = Math.floor(scaledDelta * safeDifficultyRatio)

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

// Translates a skill value into concrete puzzle parameters.
// For +/− this means a number range; for ×/÷ a set of unlocked tables.
// In custom mode the user's chosen range/tables are narrowed by skill;
// in adaptive mode the system picks ranges from scratch.
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
			const [start, end] = getAdaptiveRangeWithinBounds(baseRange, safeSkill)
			return {
				range: [start, end],
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
			range: getAdaptiveFactorRange(safeSkill),
			possibleValues: getAdaptiveSubsetWithinBounds(
				basePossibleValues,
				safeSkill
			)
		}
	}

	return {
		range: getAdaptiveFactorRange(safeSkill),
		possibleValues: getAdaptiveTables(safeSkill)
	}
}

// Decides how the puzzle is presented based on skill.
// Normal: a + b = ?  →  Alternate: a + ? = c  →  Random: ? + b = c
// Uses hysteresis so the mode doesn't flicker when skill hovers near a threshold.
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

// Maps a solved puzzle to an intrinsic difficulty score on the 0–100 skill scale.
// For +/− the difficulty grows with operand magnitude (inverse of the adaptive power curve).
// For ×/÷ the difficulty combines the table's known hardness with the second factor.
export function getPuzzleDifficulty(
	operator: Operator,
	parts: PuzzlePartSet
): number {
	if (operator === Operator.Addition || operator === Operator.Subtraction) {
		const maxOperand = Math.max(
			Math.abs(parts[0].generatedValue),
			Math.abs(parts[1].generatedValue)
		)
		const normalized = Math.max(
			0,
			(maxOperand - adaptiveTuning.addSubDifficultyBase) /
				adaptiveTuning.addSubDifficultyScale
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

// Computes a 0–1 ratio that scales skill gains based on how hard the puzzle
// is relative to the player's current skill. Puzzles at or above skill level
// yield full gains; easier puzzles yield proportionally less.
// Both sides are offset by 1 so that difficulty 0 at skill 0 → ratio 1.0
// (the puzzle is appropriate for the level) rather than 0/1 = 0.
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

// Custom-mode variant: slides a window within the user's chosen range.
// At low skill the window is narrow and starts at the bottom;
// at high skill it covers most of the range.
function getAdaptiveRangeWithinBounds(
	range: [min: number, max: number],
	skill: number
): [number, number] {
	const safeMin = Math.min(range[0], range[1])
	const safeMax = Math.max(range[0], range[1])
	const span = Math.max(1, safeMax - safeMin)
	const normalized = skill / 100

	const windowRatio =
		adaptiveTuning.customRangeWindowBaseRatio +
		normalized * adaptiveTuning.customRangeWindowScaleRatio
	const minWindow = Math.min(adaptiveTuning.customRangeMinWindowSize, span)
	const windowSize = Math.max(minWindow, Math.round(span * windowRatio))
	const maxStart = safeMax - windowSize
	const start = Math.round(safeMin + maxStart * normalized)
	const end = Math.min(safeMax, start + windowSize)
	const boundedStart = Math.max(safeMin, Math.min(start, safeMax - 1))
	const boundedEnd = Math.min(safeMax, Math.max(boundedStart + 1, end))

	return [boundedStart, boundedEnd]
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

// Custom-mode variant for tables: progressively unlocks more of the
// user's selected tables as skill increases.
function getAdaptiveSubsetWithinBounds(
	values: number[],
	skill: number
): number[] {
	const uniqueSorted = [...new Set(values)]
		.map((value) => Number(value))
		.filter((value) => Number.isFinite(value) && value > 0)
		.sort((a, b) => a - b)

	if (!uniqueSorted.length) return [1]

	const count = Math.max(
		1,
		Math.round(1 + ((uniqueSorted.length - 1) * skill) / 100)
	)

	return uniqueSorted.slice(0, count)
}
