import { invariant } from '$lib/helpers/assertions'
import { isProd } from '$lib/env'

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

// Normalised per-operator selection probabilities (0–1).
// Same shape as AdaptiveSkillMap but represents weight distribution, not skill.
export type OperatorWeights = [
	addition: number,
	subtraction: number,
	multiplication: number,
	division: number
]

// A [min, max] numeric range used for operand bounds, factor limits, etc.
export type OperandRange = [min: number, max: number]

// Fixed structural constants that are not tuning knobs.
// These are determined by the data model (e.g. enum size) or physics (e.g. min=0).
export const adaptiveInternals = {
	/** Number of operators — fixed by the Operator enum. */
	operatorCount: 4,
	/** Duration floor — time cannot be negative. */
	minDurationSeconds: 0,
	/** Integer precision for weighted table sampling. */
	tablesWeightPrecision: 20
} as const

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

// ── Active tuning context ───────────────────────────────────────────
// Default: the canonical adaptiveTuning object above.
// withTuningScope() temporarily swaps the reference for the simulation runner.
let activeTuning: typeof adaptiveTuning = adaptiveTuning

/** Returns the currently active tuning object (canonical or scoped override). */
export function getActiveTuning(): typeof adaptiveTuning {
	return activeTuning
}

/**
 * Run `fn` with a temporary tuning override. Restores the previous tuning
 * after `fn` returns. Safe only for synchronous `fn` — an async callback
 * would leak the override to concurrent callers.
 */
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

// ── Invariants (dev/test only, stripped in production) ───────────────
// If any of these fire, a tuning change broke an engine assumption.
if (!isProd) {
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

	const validateConfidenceEffect = (effect: number): void => {
		invariant(effect > 0 && effect < 1, 'confidenceEffect must be in (0, 1)')
	}

	invariant(
		t.skillBounds.minSkill >= 0 &&
			t.skillBounds.maxSkill > t.skillBounds.minSkill,
		'skill range invalid'
	)
	invariant(t.timing.maxDurationSeconds > 0, 'duration range invalid')
	invariant(
		t.penalties.basePenalty > 0 && t.penalties.slownessPenaltyBonus >= 0,
		'penalties must be positive'
	)
	invariant(
		t.penalties.lowSkillPenaltyCapThreshold > 0 &&
			t.penalties.lowSkillPenaltyCapThreshold <= t.skillBounds.maxSkill,
		'lowSkillPenaltyCapThreshold must be in (0, maxSkill]'
	)
	invariant(
		t.penalties.lowSkillPenaltyCapFraction > 0 &&
			t.penalties.lowSkillPenaltyCapFraction <= 1,
		'lowSkillPenaltyCapFraction must be in (0, 1]'
	)
	invariant(t.gains.baseSkillGain > 0, 'baseSkillGain must be positive')
	validateOrderedUnitInterval(
		t.gains.confidenceSpeedBands,
		'confidence speed fractions'
	)
	validateConfidenceEffect(t.gains.confidenceEffect)
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
		t.additionSubtraction.rangeBase > 0 &&
			t.additionSubtraction.rangeScale > 0 &&
			t.additionSubtraction.addSubExponent > 0 &&
			t.additionSubtraction.lowerBoundScale >= 0 &&
			t.additionSubtraction.lowerBoundScale < 1,
		'addition/subtraction range parameters invalid'
	)
	invariant(
		t.additionSubtraction.secondOperandSkillLag > 0 &&
			t.additionSubtraction.secondOperandSkillLag < t.skillBounds.maxSkill,
		'second operand skill lag must be positive and less than maxSkill'
	)
	invariant(
		t.multiplicationDivision.tablesBase >= 1 &&
			t.multiplicationDivision.tablesScale > 0 &&
			t.multiplicationDivision.tablesExponent > 0 &&
			t.multiplicationDivision.tablesDropScale >= 0 &&
			t.multiplicationDivision.tablesDropScale < 1,
		'adaptive tables parameters invalid'
	)
	invariant(
		t.multiplicationDivision.factorMin >= 1 &&
			t.multiplicationDivision.factorMax > t.multiplicationDivision.factorMin &&
			t.multiplicationDivision.factorMinAtMaxSkill >=
				t.multiplicationDivision.factorMin &&
			t.multiplicationDivision.factorMinAtMaxSkill <=
				t.multiplicationDivision.factorMax &&
			t.multiplicationDivision.factorMaxAtMinSkill >=
				t.multiplicationDivision.factorMin &&
			t.multiplicationDivision.factorMaxAtMinSkill <=
				t.multiplicationDivision.factorMax,
		'multiplication/division factor range parameters invalid'
	)
	invariant(
		t.puzzleMode.alternateMidpoint > 0 &&
			t.puzzleMode.randomMidpoint > t.puzzleMode.alternateMidpoint &&
			t.puzzleMode.transitionSpread > 0 &&
			t.puzzleMode.randomMidpoint <= t.skillBounds.maxSkill,
		'puzzle mode midpoints invalid'
	)
	invariant(
		t.algebraicRollout.algebraicSkillOffset >= 0 &&
			t.algebraicRollout.algebraicSkillOffset <= t.skillBounds.maxSkill,
		'algebraicSkillOffset must be in [0, maxSkill]'
	)
	invariant(
		t.algebraicRollout.negativeSubStartSkill >= 0 &&
			t.algebraicRollout.negativeSubStartSkill <
				t.algebraicRollout.negativeSubFullSkill &&
			t.algebraicRollout.negativeSubFullSkill <= t.skillBounds.maxSkill,
		'negative subtraction rollout parameters invalid'
	)
	invariant(
		t.algebraicRollout.divisorUnknownStartSkill >= 0 &&
			t.algebraicRollout.divisorUnknownStartSkill <
				t.algebraicRollout.divisorUnknownFullSkill &&
			t.algebraicRollout.divisorUnknownFullSkill <= t.skillBounds.maxSkill &&
			t.algebraicRollout.divisorUnknownProbability >= 0 &&
			t.algebraicRollout.divisorUnknownProbability <= 1,
		'division unknown-divisor rollout parameters invalid'
	)
	invariant(
		t.operatorMixing.operatorWeightBase > t.skillBounds.maxSkill,
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
				t.thresholds.difficultyWindowOvershoot,
		'weakOperatorMinDifficultyBoost must be in [0, difficultyWindowOvershoot]'
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
		t.difficultyScoring.minorOperandWeight >= 0 &&
			t.difficultyScoring.minorOperandWeight <= 0.5,
		'minorOperandWeight must be in [0, 0.5]'
	)
	invariant(
		t.difficultyScoring.carryBorrowBoost >= 0 &&
			t.difficultyScoring.carryBorrowBoost <= 0.5,
		'carryBorrowBoost must be in [0, 0.5]'
	)
	invariant(
		t.difficultyScoring.noCarryDiscount >= 0 &&
			t.difficultyScoring.noCarryDiscount < 1,
		'noCarryDiscount must be in [0, 1)'
	)
	invariant(
		t.difficultyScoring.addSubBase > 0 &&
			t.difficultyScoring.addScale > 0 &&
			t.difficultyScoring.subScale > 0,
		'addition/subtraction difficulty parameters must be positive'
	)
	// Scale must be smaller than the theoretical max effective operand,
	// otherwise difficulty 100 is unreachable. The max operand from the
	// range formula is upperBoundBase + upperBoundScale; the effective
	// blend is always ≤ that. If this fires, addDifficultyScale or
	// subDifficultyScale needs recalibrating (run the alignment test).
	invariant(
		t.difficultyScoring.addScale <
			t.additionSubtraction.rangeBase +
				t.additionSubtraction.rangeScale -
				t.difficultyScoring.addSubBase &&
			t.difficultyScoring.subScale <
				t.additionSubtraction.rangeBase +
					t.additionSubtraction.rangeScale -
					t.difficultyScoring.addSubBase,
		'difficulty scale exceeds max operand range — difficulty 100 would be unreachable'
	)
	invariant(
		t.difficultyScoring.factorWeight > 0 &&
			t.difficultyScoring.factorWeight < 1,
		'multiplication/division difficulty factor weight must be in (0, 1)'
	)
	invariant(
		t.difficultyScoring.identityFactorMultiplier > 0 &&
			t.difficultyScoring.identityFactorMultiplier <= 1,
		'identityFactorMultiplier must be in (0, 1]'
	)
	invariant(
		t.difficultyScoring.mulDivExponent > 0 &&
			t.difficultyScoring.mulDivExponent <= 1,
		'mulDivExponent must be in (0, 1]'
	)
	// Guard against top-end ×/÷ repetition: ensure the theoretical max-skill
	// pool remains large enough after table dropping and factor constraints.
	// This uses tuning-derived counts (base + scale => unlocked tables at max).
	const maxUnlockedTables = Math.round(
		t.multiplicationDivision.tablesBase + t.multiplicationDivision.tablesScale
	)
	const maxSkillDropCount = Math.floor(
		maxUnlockedTables * t.multiplicationDivision.tablesDropScale
	)
	const activeTablesAtMaxSkill = maxUnlockedTables - maxSkillDropCount
	const minFactorAtMaxSkill = Math.round(
		t.multiplicationDivision.factorMin +
			(t.multiplicationDivision.factorMinAtMaxSkill -
				t.multiplicationDivision.factorMin)
	)
	const maxFactorAtMaxSkill = Math.round(
		t.multiplicationDivision.factorMaxAtMinSkill +
			(t.multiplicationDivision.factorMax -
				t.multiplicationDivision.factorMaxAtMinSkill)
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
		t.penalties.cooldownSteps >= 0 &&
			Number.isInteger(t.penalties.cooldownSteps),
		'cooldownSteps must be a non-negative integer'
	)
	invariant(
		t.penalties.cooldownRangeReduction >= 0 &&
			t.penalties.cooldownRangeReduction < 1,
		'cooldownRangeReduction must be in [0, 1)'
	)
	invariant(
		t.additionSubtraction.carryBorrowSkillThreshold >= 0 &&
			t.additionSubtraction.carryBorrowSkillThreshold <= t.skillBounds.maxSkill,
		'carryBorrowSkillThreshold must be in skill range'
	)
	invariant(
		t.thresholds.minDifficultyRatio >= 0 && t.thresholds.minDifficultyRatio < 1,
		'minDifficultyRatio must be in [0, 1)'
	)
	invariant(
		t.thresholds.difficultyWindowOvershoot >= 0 &&
			t.thresholds.difficultyWindowOvershoot <= t.skillBounds.maxSkill,
		'difficultyWindowOvershoot must be in [0, maxSkill]'
	)
	invariant(
		t.thresholds.minWindowSize > t.thresholds.difficultyWindowOvershoot,
		'minWindowSize must exceed difficultyWindowOvershoot'
	)
	invariant(
		t.timing.maxDurationAtMaxSkill >= t.timing.maxDurationSeconds,
		'maxDurationAtMaxSkill must be >= maxDurationSeconds'
	)
}
