import { invariant } from '$lib/helpers/assertions'

// Two difficulty modes: adaptive (system-controlled ranges) and custom (user-chosen ranges).
// The IDs double as URL param values, so they must stay stable.
export const adaptiveDifficultyId = 1 as const
export const customDifficultyId = 0 as const

export type DifficultyMode =
	| typeof adaptiveDifficultyId
	| typeof customDifficultyId

// One skill value (0–100) per operator: [+, −, ×, ÷].
// Tracked separately so each operator progresses at its own pace.
// Shared across both difficulty modes so every quiz affects the same skill.
export type AdaptiveSkillMap = [
	addition: number,
	subtraction: number,
	multiplication: number,
	division: number
]

export const defaultAdaptiveSkillMap: AdaptiveSkillMap = [0, 0, 0, 0]

// Central knobs for the adaptive difficulty engine.
// Kept in one object so tuning changes stay localised.
export const adaptiveTuning = {
	skillBounds: {
		minSkill: 0,
		maxSkill: 100,
		adaptiveAllOperatorCount: 4
	},
	operatorMixing: {
		adaptiveAllWeightBase: 110,
		skillGapDampingFactor: 0.7,
		weakOperatorMinDifficultyBoost: 5,
		weakOperatorGapThreshold: 15
	},
	timing: {
		minDurationSeconds: 0,
		maxDurationSeconds: 6,
		maxDurationSecondsAtMaxSkill: 10
	},
	penalties: {
		incorrectPenaltyBase: 3,
		incorrectPenaltySlownessFactor: 2,
		incorrectCooldownSteps: 2,
		incorrectCooldownRangeReduction: 0.15
	},
	gains: {
		correctGainBase: 0.9,
		correctGainSpeedFactor: 3,
		correctGainSpeedFactorAtMinSkill: 1.5,
		confidenceSpeedRange: [0.35, 0.75] as const,
		confidenceGainRange: [0.9, 1.1] as const
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
		additionSubtractionMinUpperBound: 5,
		additionSubtractionUpperBoundBase: 5,
		additionSubtractionUpperBoundScale: 95,
		additionExponent: 1.9,
		subtractionExponent: 1.9,
		additionSubtractionLowerBoundScale: 0.45,
		additionSubtractionSecondOperandSkillLag: 10,
		carryBorrowSkillThreshold: 30
	},
	thresholds: {
		minDifficultyThreshold: 0.4,
		adaptiveDifficultyMaxOvershoot: 15,
		asymmetricWindowFloor: 25
	},
	multiplicationDivision: {
		adaptiveTablesBase: 2,
		adaptiveTablesScale: 12,
		adaptiveTablesExponent: 0.9,
		adaptiveTablesDropScale: 0.45,
		adaptiveTablesWeightPrecision: 20,
		mulDivFactorMin: 1,
		mulDivFactorMax: 10,
		mulDivFactorMinAtMaxSkill: 7,
		mulDivFactorMaxAtMinSkill: 6
	},
	puzzleMode: {
		adaptiveModeAlternateMidpoint: 35,
		adaptiveModeRandomMidpoint: 60,
		adaptiveModeSpread: 10
	},
	algebraicRollout: {
		algebraicSkillOffset: 15,
		adaptiveNegativeSubtractionStartSkill: 55,
		adaptiveNegativeSubtractionFullSkill: 70,
		adaptiveDivisionDivisorUnknownStartSkill: 65,
		adaptiveDivisionDivisorUnknownFullSkill: 95,
		adaptiveDivisionDivisorUnknownProbabilityInAlternate: 0.45
	},
	difficultyScoring: {
		addSubMinorOperandWeight: 0.4,
		addSubCarryBorrowBoost: 0.15,
		addSubNoCarryDiscount: 0.1,
		maxTableDifficultyScore: 68,
		addSubDifficultyBase: 1,
		addDifficultyScale: 65,
		subDifficultyScale: 80,
		mulDivFactorWeight: 0.4,
		mulDivTableWeight: 0.6,
		mulDivIdentityTableFactorMultiplier: 0.6,
		mulDivDifficultyExponent: 0.85
	},
	remediation: {
		remediationThresholdAccuracy: 0.6,
		remediationMinPuzzles: 3,
		remediationSlowResponseSeconds: 1.5,
		remediationFastLowAccuracyMinPuzzles: 5
	}
}

// ── Invariants (dev/test only, stripped in production) ───────────────
// If any of these fire, a tuning change broke an engine assumption.
if (!import.meta.env.PROD) {
	const t = adaptiveTuning
	const validateOrderedUnitInterval = (
		range: readonly [low: number, high: number],
		label: string
	): void => {
		const [low, high] = range
		invariant(
			low >= 0 && low <= high && high <= 1,
			`${label} must be in [0, 1] and ordered`
		)
	}

	const validateConfidenceGainRange = (
		range: readonly [low: number, high: number]
	): void => {
		const [low, high] = range
		invariant(
			low > 0 && low <= 1 && high >= 1,
			'confidence gain multipliers must be positive and bracket 1'
		)
	}

	invariant(
		t.skillBounds.minSkill >= 0 &&
			t.skillBounds.maxSkill > t.skillBounds.minSkill,
		'skill range invalid'
	)
	invariant(
		t.skillBounds.adaptiveAllOperatorCount === 4,
		'operator count must match Operator enum (4)'
	)
	invariant(
		t.timing.minDurationSeconds >= 0 &&
			t.timing.maxDurationSeconds > 0 &&
			t.timing.maxDurationSeconds > t.timing.minDurationSeconds,
		'duration range invalid'
	)
	invariant(
		t.penalties.incorrectPenaltyBase > 0 &&
			t.penalties.incorrectPenaltySlownessFactor >= 0,
		'penalties must be positive'
	)
	invariant(
		t.gains.correctGainBase > 0 &&
			t.gains.correctGainSpeedFactor > 0 &&
			t.gains.correctGainSpeedFactorAtMinSkill > 0 &&
			t.gains.correctGainSpeedFactorAtMinSkill <=
				t.gains.correctGainSpeedFactor,
		'gains must be positive and minSkill speed factor must not exceed max'
	)
	validateOrderedUnitInterval(
		t.gains.confidenceSpeedRange,
		'confidence speed fractions'
	)
	validateConfidenceGainRange(t.gains.confidenceGainRange)
	invariant(
		t.calibration.calibrationThreshold > 0 &&
			t.calibration.calibrationThreshold < t.skillBounds.maxSkill,
		'calibration threshold out of range'
	)
	invariant(
		t.calibration.calibrationMaxBoost >= 1,
		'calibration boost must be >= 1'
	)
	invariant(
		t.calibration.taperThreshold > 0 &&
			t.calibration.taperThreshold < t.skillBounds.maxSkill,
		'taper threshold out of range'
	)
	invariant(
		t.calibration.taperMinGain > 0 && t.calibration.taperMinGain <= 1,
		'taperMinGain must be in (0, 1]'
	)
	invariant(
		t.streak.streakBoostMaxSpeedFraction > 0 &&
			t.streak.streakBoostMaxSpeedFraction <= 1,
		'streakBoostMaxSpeedFraction must be in (0, 1]'
	)
	invariant(
		t.calibration.calibrationThreshold < t.calibration.taperThreshold,
		'calibration and taper zones must not overlap'
	)
	invariant(
		t.additionSubtraction.additionSubtractionMinUpperBound > 0 &&
			t.additionSubtraction.additionSubtractionUpperBoundBase > 0 &&
			t.additionSubtraction.additionSubtractionUpperBoundScale > 0 &&
			t.additionSubtraction.additionExponent > 0 &&
			t.additionSubtraction.subtractionExponent > 0 &&
			t.additionSubtraction.additionSubtractionLowerBoundScale >= 0 &&
			t.additionSubtraction.additionSubtractionLowerBoundScale < 1,
		'addition/subtraction range parameters invalid'
	)
	invariant(
		t.additionSubtraction.additionSubtractionSecondOperandSkillLag > 0 &&
			t.additionSubtraction.additionSubtractionSecondOperandSkillLag <
				t.skillBounds.maxSkill,
		'second operand skill lag must be positive and less than maxSkill'
	)
	invariant(
		t.multiplicationDivision.adaptiveTablesBase >= 1 &&
			t.multiplicationDivision.adaptiveTablesScale > 0 &&
			t.multiplicationDivision.adaptiveTablesExponent > 0 &&
			t.multiplicationDivision.adaptiveTablesDropScale >= 0 &&
			t.multiplicationDivision.adaptiveTablesDropScale < 1 &&
			t.multiplicationDivision.adaptiveTablesWeightPrecision >= 5 &&
			t.multiplicationDivision.adaptiveTablesWeightPrecision <= 100 &&
			Number.isInteger(t.multiplicationDivision.adaptiveTablesWeightPrecision),
		'adaptive tables parameters invalid'
	)
	invariant(
		t.multiplicationDivision.mulDivFactorMin >= 1 &&
			t.multiplicationDivision.mulDivFactorMax >
				t.multiplicationDivision.mulDivFactorMin &&
			t.multiplicationDivision.mulDivFactorMinAtMaxSkill >=
				t.multiplicationDivision.mulDivFactorMin &&
			t.multiplicationDivision.mulDivFactorMinAtMaxSkill <=
				t.multiplicationDivision.mulDivFactorMax &&
			t.multiplicationDivision.mulDivFactorMaxAtMinSkill >=
				t.multiplicationDivision.mulDivFactorMin &&
			t.multiplicationDivision.mulDivFactorMaxAtMinSkill <=
				t.multiplicationDivision.mulDivFactorMax,
		'multiplication/division factor range parameters invalid'
	)
	invariant(
		t.puzzleMode.adaptiveModeAlternateMidpoint > 0 &&
			t.puzzleMode.adaptiveModeRandomMidpoint >
				t.puzzleMode.adaptiveModeAlternateMidpoint &&
			t.puzzleMode.adaptiveModeSpread > 0 &&
			t.puzzleMode.adaptiveModeRandomMidpoint <= t.skillBounds.maxSkill,
		'puzzle mode midpoints invalid'
	)
	invariant(
		t.algebraicRollout.algebraicSkillOffset >= 0 &&
			t.algebraicRollout.algebraicSkillOffset <= t.skillBounds.maxSkill,
		'algebraicSkillOffset must be in [0, maxSkill]'
	)
	invariant(
		t.algebraicRollout.adaptiveNegativeSubtractionStartSkill >= 0 &&
			t.algebraicRollout.adaptiveNegativeSubtractionStartSkill <
				t.algebraicRollout.adaptiveNegativeSubtractionFullSkill &&
			t.algebraicRollout.adaptiveNegativeSubtractionFullSkill <=
				t.skillBounds.maxSkill,
		'negative subtraction rollout parameters invalid'
	)
	invariant(
		t.algebraicRollout.adaptiveDivisionDivisorUnknownStartSkill >= 0 &&
			t.algebraicRollout.adaptiveDivisionDivisorUnknownStartSkill <
				t.algebraicRollout.adaptiveDivisionDivisorUnknownFullSkill &&
			t.algebraicRollout.adaptiveDivisionDivisorUnknownFullSkill <=
				t.skillBounds.maxSkill &&
			t.algebraicRollout.adaptiveDivisionDivisorUnknownProbabilityInAlternate >=
				0 &&
			t.algebraicRollout.adaptiveDivisionDivisorUnknownProbabilityInAlternate <=
				1,
		'division unknown-divisor rollout parameters invalid'
	)
	invariant(
		t.operatorMixing.adaptiveAllWeightBase > t.skillBounds.maxSkill,
		'weight base must exceed maxSkill so no operator gets zero weight'
	)
	invariant(
		t.operatorMixing.skillGapDampingFactor > 0 &&
			t.operatorMixing.skillGapDampingFactor <= 1,
		'skillGapDampingFactor must be in (0, 1]'
	)
	invariant(
		t.operatorMixing.weakOperatorMinDifficultyBoost >= 0 &&
			t.operatorMixing.weakOperatorMinDifficultyBoost <=
				t.thresholds.adaptiveDifficultyMaxOvershoot,
		'weakOperatorMinDifficultyBoost must be in [0, adaptiveDifficultyMaxOvershoot]'
	)
	invariant(
		t.operatorMixing.weakOperatorGapThreshold > 0 &&
			t.operatorMixing.weakOperatorGapThreshold <= t.skillBounds.maxSkill,
		'weakOperatorGapThreshold must be in (0, maxSkill]'
	)
	invariant(
		t.difficultyScoring.maxTableDifficultyScore > 0,
		'maxTableDifficultyScore must be positive'
	)
	invariant(
		t.difficultyScoring.addSubMinorOperandWeight >= 0 &&
			t.difficultyScoring.addSubMinorOperandWeight <= 0.5,
		'addSubMinorOperandWeight must be in [0, 0.5]'
	)
	invariant(
		t.difficultyScoring.addSubCarryBorrowBoost >= 0 &&
			t.difficultyScoring.addSubCarryBorrowBoost <= 0.5,
		'addSubCarryBorrowBoost must be in [0, 0.5]'
	)
	invariant(
		t.difficultyScoring.addSubNoCarryDiscount >= 0 &&
			t.difficultyScoring.addSubNoCarryDiscount < 1,
		'addSubNoCarryDiscount must be in [0, 1)'
	)
	invariant(
		t.difficultyScoring.addSubDifficultyBase > 0 &&
			t.difficultyScoring.addDifficultyScale > 0 &&
			t.difficultyScoring.subDifficultyScale > 0,
		'addition/subtraction difficulty parameters must be positive'
	)
	// Scale must be smaller than the theoretical max effective operand,
	// otherwise difficulty 100 is unreachable. The max operand from the
	// range formula is upperBoundBase + upperBoundScale; the effective
	// blend is always ≤ that. If this fires, addDifficultyScale or
	// subDifficultyScale needs recalibrating (run the alignment test).
	invariant(
		t.difficultyScoring.addDifficultyScale <
			t.additionSubtraction.additionSubtractionUpperBoundBase +
				t.additionSubtraction.additionSubtractionUpperBoundScale -
				t.difficultyScoring.addSubDifficultyBase &&
			t.difficultyScoring.subDifficultyScale <
				t.additionSubtraction.additionSubtractionUpperBoundBase +
					t.additionSubtraction.additionSubtractionUpperBoundScale -
					t.difficultyScoring.addSubDifficultyBase,
		'difficulty scale exceeds max operand range — difficulty 100 would be unreachable'
	)
	invariant(
		t.difficultyScoring.mulDivFactorWeight > 0 &&
			t.difficultyScoring.mulDivTableWeight > 0 &&
			t.difficultyScoring.mulDivFactorWeight +
				t.difficultyScoring.mulDivTableWeight ===
				1,
		'multiplication/division difficulty weights must be positive and sum to 1'
	)
	invariant(
		t.difficultyScoring.mulDivIdentityTableFactorMultiplier > 0 &&
			t.difficultyScoring.mulDivIdentityTableFactorMultiplier <= 1,
		'mulDivIdentityTableFactorMultiplier must be in (0, 1]'
	)
	invariant(
		t.difficultyScoring.mulDivDifficultyExponent > 0 &&
			t.difficultyScoring.mulDivDifficultyExponent <= 1,
		'mulDivDifficultyExponent must be in (0, 1]'
	)
	// Guard against top-end ×/÷ repetition: ensure the theoretical max-skill
	// pool remains large enough after table dropping and factor constraints.
	// This uses tuning-derived counts (base + scale => unlocked tables at max).
	const maxUnlockedTables = Math.round(
		t.multiplicationDivision.adaptiveTablesBase +
			t.multiplicationDivision.adaptiveTablesScale
	)
	const maxSkillDropCount = Math.floor(
		maxUnlockedTables * t.multiplicationDivision.adaptiveTablesDropScale
	)
	const activeTablesAtMaxSkill = maxUnlockedTables - maxSkillDropCount
	const minFactorAtMaxSkill = Math.round(
		t.multiplicationDivision.mulDivFactorMin +
			(t.multiplicationDivision.mulDivFactorMinAtMaxSkill -
				t.multiplicationDivision.mulDivFactorMin)
	)
	const maxFactorAtMaxSkill = Math.round(
		t.multiplicationDivision.mulDivFactorMaxAtMinSkill +
			(t.multiplicationDivision.mulDivFactorMax -
				t.multiplicationDivision.mulDivFactorMaxAtMinSkill)
	)
	const factorCountAtMaxSkill =
		Math.max(minFactorAtMaxSkill, maxFactorAtMaxSkill) - minFactorAtMaxSkill + 1
	const mulDivPoolSizeAtMaxSkill =
		activeTablesAtMaxSkill * factorCountAtMaxSkill
	invariant(
		mulDivPoolSizeAtMaxSkill >= 30,
		'max-skill multiplication/division pool too small; risk of excessive repeats'
	)
	invariant(
		t.streak.streakBoostThreshold > 0 &&
			Number.isInteger(t.streak.streakBoostThreshold),
		'streakBoostThreshold must be a positive integer'
	)
	invariant(
		t.streak.streakBoostMultiplier >= 1,
		'streakBoostMultiplier must be >= 1'
	)
	invariant(
		t.penalties.incorrectCooldownSteps >= 0 &&
			Number.isInteger(t.penalties.incorrectCooldownSteps),
		'incorrectCooldownSteps must be a non-negative integer'
	)
	invariant(
		t.penalties.incorrectCooldownRangeReduction >= 0 &&
			t.penalties.incorrectCooldownRangeReduction < 1,
		'incorrectCooldownRangeReduction must be in [0, 1)'
	)
	invariant(
		t.additionSubtraction.carryBorrowSkillThreshold >= 0 &&
			t.additionSubtraction.carryBorrowSkillThreshold <= t.skillBounds.maxSkill,
		'carryBorrowSkillThreshold must be in skill range'
	)
	invariant(
		t.thresholds.minDifficultyThreshold >= 0 &&
			t.thresholds.minDifficultyThreshold < 1,
		'minDifficultyThreshold must be in [0, 1)'
	)
	invariant(
		t.thresholds.adaptiveDifficultyMaxOvershoot >= 0 &&
			t.thresholds.adaptiveDifficultyMaxOvershoot <= t.skillBounds.maxSkill,
		'adaptiveDifficultyMaxOvershoot must be in [0, maxSkill]'
	)
	invariant(
		t.thresholds.asymmetricWindowFloor >
			t.thresholds.adaptiveDifficultyMaxOvershoot,
		'asymmetricWindowFloor must exceed adaptiveDifficultyMaxOvershoot'
	)
	invariant(
		t.timing.maxDurationSecondsAtMaxSkill >= t.timing.maxDurationSeconds,
		'maxDurationSecondsAtMaxSkill must be >= maxDurationSeconds'
	)
}
