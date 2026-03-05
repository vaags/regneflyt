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
	maxDurationSeconds: 6,
	timeoutPenalty: 6,
	incorrectPenaltyBase: 3,
	incorrectPenaltySlownessFactor: 2,
	correctGainBase: 1,
	correctGainSpeedFactor: 5,
	calibrationThreshold: 40,
	calibrationMaxBoost: 1.5,
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
