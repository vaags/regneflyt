// Central knobs for the adaptive difficulty engine.
// Kept in one object so tuning changes stay localised.
export const adaptiveTuning = {
	skillBounds: {
		minSkill: 0,
		maxSkill: 100
	},
	operatorMixing: {
		operatorWeightBase: 110,
		skillGapDampingFactor: 0.7,
		weakOperatorMinDifficultyBoost: 5,
		weakOperatorGapThreshold: 15
	},
	timing: {
		maxDurationSeconds: 6,
		maxDurationAtMaxSkill: 10
	},
	penalties: {
		basePenalty: 3,
		slownessPenaltyBonus: 2,
		lowSkillPenaltyCapThreshold: 10,
		lowSkillPenaltyCapFraction: 0.5,
		cooldownSteps: 2,
		cooldownRangeReduction: 0.15
	},
	gains: {
		baseSkillGain: 0.9,
		speedGainRange: [1.5, 3] as readonly [number, number],
		confidenceSpeedBands: [0.35, 0.75] as readonly [number, number],
		confidenceEffect: 0.1
	},
	streak: {
		streakBoostThreshold: 8,
		streakBoostMultiplier: 1.25,
		streakBoostMaxSpeedFraction: 0.65
	},
	calibration: {
		calibrationThreshold: 40,
		calibrationMaxBoost: 1.1,
		taperThreshold: 60,
		taperMinGain: 0.35
	},
	additionSubtraction: {
		rangeBase: 5,
		rangeScale: 95,
		addSubExponent: 1.9,
		lowerBoundScale: 0.45,
		secondOperandSkillLag: 10,
		carryBorrowSkillThreshold: 30
	},
	thresholds: {
		minDifficultyRatio: 0.4,
		difficultyWindowOvershoot: 15,
		minWindowSize: 25
	},
	multiplicationDivision: {
		tablesBase: 2,
		tablesScale: 12,
		tablesExponent: 0.9,
		tablesDropScale: 0.45,
		factorMin: 1,
		factorMax: 10,
		factorMinAtMaxSkill: 7,
		factorMaxAtMinSkill: 6
	},
	puzzleMode: {
		alternateMidpoint: 40,
		randomMidpoint: 68,
		transitionSpread: 14
	},
	algebraicRollout: {
		algebraicSkillOffset: 15,
		negativeSubStartSkill: 55,
		negativeSubFullSkill: 70,
		divisorUnknownStartSkill: 65,
		divisorUnknownFullSkill: 95,
		divisorUnknownProbability: 0.45
	},
	difficultyScoring: {
		minorOperandWeight: 0.4,
		carryBorrowBoost: 0.15,
		noCarryDiscount: 0.1,
		maxTableDifficultyScore: 68,
		addSubBase: 1,
		addScale: 65,
		subScale: 80,
		factorWeight: 0.4,
		identityFactorMultiplier: 0.6,
		mulDivExponent: 0.85
	}
}

let activeTuning: typeof adaptiveTuning = adaptiveTuning

/** Returns the currently active tuning object. */
export function getActiveTuning(): typeof adaptiveTuning {
	return activeTuning
}

/** Runs a synchronous callback with a temporary tuning override. */
export function withTuningScope<T>(
	tuning: typeof adaptiveTuning,
	fn: () => T
): T {
	const previous = activeTuning
	activeTuning = tuning
	try {
		return fn()
	} finally {
		activeTuning = previous
	}
}
