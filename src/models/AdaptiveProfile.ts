import { Operator } from './constants/Operator'
import { PuzzleMode } from './constants/PuzzleMode'

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
	minDurationSeconds: 0,
	maxDurationSeconds: 12,
	timeoutPenalty: 9,
	incorrectPenalty: 8,
	correctGainBase: 1,
	correctGainSpeedFactor: 4,
	additionSubtractionMinUpperBound: 2,
	additionSubtractionUpperBoundBase: 2,
	additionSubtractionUpperBoundScale: 198,
	additionSubtractionUpperBoundExponent: 1.45,
	customRangeWindowBaseRatio: 0.15,
	customRangeWindowScaleRatio: 0.85,
	adaptiveTablesBase: 1,
	adaptiveTablesScale: 11,
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
	if (!Array.isArray(value) || value.length !== 4)
		return [...defaultAdaptiveSkillMap] as AdaptiveSkillMap

	return [0, 1, 2, 3].map((operator) =>
		clampSkill(Number(value[operator]))
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

	if (!isCorrect)
		return clampSkill(normalizedSkill - adaptiveTuning.incorrectPenalty)

	const clampedDuration = Math.max(
		adaptiveTuning.minDurationSeconds,
		Math.min(adaptiveTuning.maxDurationSeconds, durationSeconds)
	)
	const speedFactor =
		(adaptiveTuning.maxDurationSeconds - clampedDuration) /
		adaptiveTuning.maxDurationSeconds
	const delta = Math.round(
		adaptiveTuning.correctGainBase +
			speedFactor * adaptiveTuning.correctGainSpeedFactor
	)

	return clampSkill(normalizedSkill + delta)
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

		const upperBound = getAdaptiveUpperBound(safeSkill)
		return {
			range: [1, upperBound],
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

function getAdaptiveUpperBound(skill: number): number {
	const normalized = skill / 100
	const curve = Math.pow(
		normalized,
		adaptiveTuning.additionSubtractionUpperBoundExponent
	)

	return Math.max(
		adaptiveTuning.additionSubtractionMinUpperBound,
		Math.round(
			adaptiveTuning.additionSubtractionUpperBoundBase +
				curve * adaptiveTuning.additionSubtractionUpperBoundScale
		)
	)
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
	const highestTable = Math.max(
		adaptiveTuning.adaptiveTablesBase,
		Math.round(
			adaptiveTuning.adaptiveTablesBase +
				(adaptiveTuning.adaptiveTablesScale * skill) / 100
		)
	)
	return Array.from({ length: highestTable }, (_, i) => i + 1)
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
