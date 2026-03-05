import { Operator } from './constants/Operator'
import { PuzzleMode } from './constants/PuzzleMode'
import { AppSettings, tablesByDifficulty } from './constants/AppSettings'

export const adaptiveDifficultyId = 1 as const
export const customAdaptiveDifficultyId = 0 as const

export type AdaptiveDifficulty =
	| typeof adaptiveDifficultyId
	| typeof customAdaptiveDifficultyId

export type DifficultyMode = AdaptiveDifficulty

export type AdaptiveMode = 'adaptive' | 'custom'

export type AdaptiveSkillMap = [number, number, number, number]

export type AdaptiveProfiles = {
	adaptive: AdaptiveSkillMap
	custom: AdaptiveSkillMap
}

export const defaultAdaptiveSkillMap: AdaptiveSkillMap = [0, 0, 0, 0]

export const defaultAdaptiveProfiles: AdaptiveProfiles = {
	adaptive: [...defaultAdaptiveSkillMap] as AdaptiveSkillMap,
	custom: [...defaultAdaptiveSkillMap] as AdaptiveSkillMap
}

export const adaptiveTuning = {
	minSkill: 0,
	maxSkill: 100,
	adaptiveAllOperatorCount: 4,
	adaptiveAllWeightBase: 110,
	minDurationSeconds: 0,
	maxDurationSeconds: 12,
	timeoutPenalty: 6,
	incorrectPenaltyBase: 3,
	incorrectPenaltySlownessFactor: 2,
	correctGainBase: 2,
	correctGainSpeedFactor: 4,
	calibrationThreshold: 40,
	calibrationMaxBoost: 2,
	additionSubtractionMinUpperBound: 5,
	additionSubtractionUpperBoundBase: 5,
	additionSubtractionUpperBoundScale: 195,
	additionSubtractionUpperBoundExponent: 1.45,
	additionSubtractionLowerBoundScale: 0.25,
	customRangeWindowBaseRatio: 0.15,
	customRangeWindowScaleRatio: 0.85,
	adaptiveTablesBase: 2,
	adaptiveTablesScale: 12,
	adaptiveTablesDropScale: 0.3,
	adaptiveModeAlternateThreshold: 35,
	adaptiveModeRandomThreshold: 70,
	adaptiveModeHysteresis: 5
} as const

export function getAdaptiveMode(
	difficulty: DifficultyMode | undefined
): AdaptiveMode {
	return difficulty === customAdaptiveDifficultyId ? 'custom' : 'adaptive'
}

export function normalizeDifficulty(
	difficultyParam: number | undefined
): AdaptiveDifficulty {
	if (difficultyParam === customAdaptiveDifficultyId)
		return customAdaptiveDifficultyId

	return adaptiveDifficultyId
}

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

export function getUpdatedSkill(
	skill: number,
	isCorrect: boolean,
	durationSeconds: number,
	timeout: boolean
) {
	const normalizedSkill = clampSkill(skill)

	if (timeout)
		return clampSkill(normalizedSkill - adaptiveTuning.timeoutPenalty)

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
	const baseDelta = Math.round(
		adaptiveTuning.correctGainBase +
			speedFactor * adaptiveTuning.correctGainSpeedFactor
	)
	const delta = Math.round(baseDelta * getCalibrationBoost(normalizedSkill))

	return clampSkill(normalizedSkill + delta)
}

function getCalibrationBoost(skill: number): number {
	const { calibrationThreshold, calibrationMaxBoost } = adaptiveTuning
	if (skill >= calibrationThreshold) return 1

	return (
		1 +
		((calibrationThreshold - skill) / calibrationThreshold) *
			(calibrationMaxBoost - 1)
	)
}

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
			range: [0, 0],
			possibleValues: getAdaptiveSubsetWithinBounds(
				basePossibleValues,
				safeSkill
			)
		}
	}

	return {
		range: [0, 0],
		possibleValues: getAdaptiveTables(safeSkill)
	}
}

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
	const windowSize = Math.max(1, Math.round(span * windowRatio))
	const maxStart = safeMax - windowSize
	const start = Math.round(safeMin + maxStart * normalized)
	const end = Math.min(safeMax, start + windowSize)
	const boundedStart = Math.max(safeMin, Math.min(start, safeMax - 1))
	const boundedEnd = Math.min(safeMax, Math.max(boundedStart + 1, end))

	return [boundedStart, boundedEnd]
}

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
