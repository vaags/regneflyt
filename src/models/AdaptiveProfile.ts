// Two difficulty modes: adaptive (system-controlled ranges) and custom (user-chosen ranges).
// The IDs double as URL param values, so they must stay stable.
export const adaptiveDifficultyId = 1 as const
export const customAdaptiveDifficultyId = 0 as const

export type AdaptiveDifficulty =
	| typeof adaptiveDifficultyId
	| typeof customAdaptiveDifficultyId

export type DifficultyMode = AdaptiveDifficulty

export type AdaptiveMode = 'adaptive' | 'custom'

// One skill value (0–100) per operator: [+, −, ×, ÷].
// Tracked separately so each operator progresses at its own pace.
export type AdaptiveSkillMap = [number, number, number, number]

// Skill maps are stored per difficulty mode so switching between
// adaptive and custom doesn't reset the other mode's progress.
export type AdaptiveProfiles = {
	adaptive: AdaptiveSkillMap
	custom: AdaptiveSkillMap
}

export const defaultAdaptiveSkillMap: AdaptiveSkillMap = [0, 0, 0, 0]

export const defaultAdaptiveProfiles: AdaptiveProfiles = {
	adaptive: [...defaultAdaptiveSkillMap] as AdaptiveSkillMap,
	custom: [...defaultAdaptiveSkillMap] as AdaptiveSkillMap
}

// Central knobs for the adaptive difficulty engine.
// Kept in one object so tuning changes stay localised.
export const adaptiveTuning = {
	minSkill: 0,
	maxSkill: 100,
	adaptiveAllOperatorCount: 4,
	// Base weight when mixing all operators — high so weaker operators
	// get proportionally more puzzles without starving strong ones.
	adaptiveAllWeightBase: 110,
	minDurationSeconds: 0,
	// Answers slower than this are treated as "slow" — no speed bonus.
	maxDurationSeconds: 6,
	// Flat penalty when the timer runs out — harsh to discourage guessing.
	timeoutPenalty: 6,
	incorrectPenaltyBase: 3,
	// Wrong + slow hurts more than wrong + fast, because slow-and-wrong
	// suggests the player is struggling rather than making a typo.
	incorrectPenaltySlownessFactor: 2,
	// Gain curve: fast correct answers earn up to base + speedFactor,
	// slow correct answers earn only base. Rewards fluency over guessing.
	correctGainBase: 1,
	correctGainSpeedFactor: 5,
	// Below this skill, gains are boosted so players don't feel stuck
	// in the early levels where everything is trivially easy.
	calibrationThreshold: 40,
	calibrationMaxBoost: 1.5,
	// Above this skill, gains taper down so the last stretch feels earned.
	// At maxSkill the multiplier drops to taperMinGain (e.g. 0.4 = 40% of normal).
	taperThreshold: 60,
	taperMinGain: 0.4,
	// Addition/subtraction range grows on a power curve so low-skill
	// players stay in single digits while high-skill players reach 200.
	additionSubtractionMinUpperBound: 5,
	additionSubtractionUpperBoundBase: 5,
	additionSubtractionUpperBoundScale: 195,
	additionSubtractionUpperBoundExponent: 1.45,
	// Lower bound rises with skill so advanced players don't see "1 + 2".
	additionSubtractionLowerBoundScale: 0.25,
	// In custom mode the user picks a range; we slide a window within it.
	// Starts narrow (15% of span) and widens to 100% at max skill.
	customRangeWindowBaseRatio: 0.15,
	customRangeWindowScaleRatio: 0.85,
	// Multiplication tables unlocked: starts at 2 easiest, scales to 14.
	adaptiveTablesBase: 2,
	adaptiveTablesScale: 12,
	// Gradually drops the easiest tables so advanced players aren't
	// still grinding 1× and 2× when they've unlocked 12×.
	adaptiveTablesDropScale: 0.3,
	// Puzzle presentation thresholds — Normal (a+b=?) → Alternate (a+?=c)
	// → Random. Hysteresis prevents flickering at boundaries.
	adaptiveModeAlternateThreshold: 35,
	adaptiveModeRandomThreshold: 70,
	adaptiveModeHysteresis: 5
} as const
