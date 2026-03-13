import { invariant } from '../helpers/assertions'

// Two difficulty modes: adaptive (system-controlled ranges) and custom (user-chosen ranges).
// The IDs double as URL param values, so they must stay stable.
export const adaptiveDifficultyId = 1 as const
export const customAdaptiveDifficultyId = 0 as const

export type AdaptiveDifficulty =
	| typeof adaptiveDifficultyId
	| typeof customAdaptiveDifficultyId

export type DifficultyMode = AdaptiveDifficulty

// One skill value (0–100) per operator: [+, −, ×, ÷].
// Tracked separately so each operator progresses at its own pace.
// Shared across both difficulty modes so every quiz affects the same skill.
export type AdaptiveSkillMap = [number, number, number, number]

export const defaultAdaptiveSkillMap: AdaptiveSkillMap = [0, 0, 0, 0]

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
	// At max skill, allow more time since puzzles involve larger numbers.
	// Linearly interpolated from maxDurationSeconds to this value.
	maxDurationSecondsAtMaxSkill: 10,
	incorrectPenaltyBase: 3,
	// Wrong + slow hurts more than wrong + fast, because slow-and-wrong
	// suggests the player is struggling rather than making a typo.
	incorrectPenaltySlownessFactor: 2,
	// After an incorrect answer, narrow the range for the next N puzzles
	// so the player gets slightly easier problems while recovering.
	incorrectCooldownSteps: 2,
	incorrectCooldownRangeReduction: 0.15,
	// Gain curve: fast correct answers earn up to base + speedFactor,
	// slow correct answers earn only base. Rewards fluency over guessing.
	correctGainBase: 1,
	correctGainSpeedFactor: 3,
	// Boost gain after N consecutive correct answers — rewards sustained focus.
	streakBoostThreshold: 5,
	streakBoostMultiplier: 1.3,
	// Below this skill, gains are boosted so players don't feel stuck
	// in the early levels where everything is trivially easy.
	calibrationThreshold: 40,
	calibrationMaxBoost: 1.25,
	// Above this skill, gains taper down so the last stretch feels earned.
	// At maxSkill the multiplier drops to taperMinGain (e.g. 0.35 = 35% of normal).
	taperThreshold: 60,
	taperMinGain: 0.35,
	// Addition/subtraction range grows on a power curve so low-skill
	// players stay in single digits while high-skill players reach 200.
	additionSubtractionMinUpperBound: 5,
	additionSubtractionUpperBoundBase: 5,
	additionSubtractionUpperBoundScale: 195,
	// Power curve exponents for range generation and difficulty scoring.
	// Range uses skill^exp; difficulty uses operand^(1/exp) as the inverse.
	// Subtraction gets a steeper curve since it's cognitively harder.
	additionExponent: 1.7,
	subtractionExponent: 1.9,
	// Lower bound rises with skill so advanced players don't see "1 + 2".
	additionSubtractionLowerBoundScale: 0.45,
	// Second operand lags behind the first by this many skill points,
	// creating an intermediate phase where only one operand crosses into
	// the next digit count. Smooths both the single→double and double→triple
	// digit transitions.
	additionSubtractionSecondOperandSkillLag: 15,
	// Below this skill, prefer operands that don't require carrying (addition)
	// or borrowing (subtraction), keeping early puzzles approachable.
	carryBorrowSkillThreshold: 30,
	// Multiplication tables unlocked: starts at 2 easiest, scales to 14.
	// Power curve keeps low-skill players on easy tables longer.
	adaptiveTablesBase: 2,
	adaptiveTablesScale: 12,
	adaptiveTablesExponent: 1.5,
	// Gradually drops the easiest tables so advanced players aren't
	// still grinding 1× and 2× when they've unlocked 12×.
	adaptiveTablesDropScale: 0.5,
	// Second factor for ×/÷ puzzles: scales from [1, max] at skill 0
	// to [minFactor, max] at skill 100, filtering out trivial ×1 / ×2.
	mulDivFactorMin: 1,
	mulDivFactorMax: 10,
	mulDivFactorMinAtMaxSkill: 5,
	// Puzzle presentation — probability-based blending of Normal (a+b=?),
	// Alternate (a+?=c), and Random (?+b=c). Midpoints control where each
	// harder mode reaches 50% probability; spread controls the transition width.
	adaptiveModeAlternateMidpoint: 35,
	adaptiveModeRandomMidpoint: 60,
	adaptiveModeSpread: 10,
	// Subtraction skill must reach this level before negative answers appear.
	adaptiveNegativeAnswersThreshold: 45,
	// Puzzle difficulty scoring — maps intrinsic puzzle hardness to the 0–100 skill scale.
	// +/− uses the inverse of the adaptive power curve; ×/÷ uses tableDifficultyScores.
	maxTableDifficultyScore: 68,
	addSubDifficultyBase: 1,
	addDifficultyScale: 199,
	// Subtraction has a lower max range (100 vs 200), so it needs its own scale
	// to ensure the hardest subtraction puzzles score close to difficulty 100.
	subDifficultyScale: 99,
	mulDivFactorWeight: 0.3,
	mulDivTableWeight: 0.7
} as const

// ── Invariants (dev/test only, stripped in production) ───────────────
// If any of these fire, a tuning change broke an engine assumption.
if (!import.meta.env.PROD) {
	const t = adaptiveTuning
	invariant(t.minSkill >= 0 && t.maxSkill > t.minSkill, 'skill range invalid')
	invariant(
		t.adaptiveAllOperatorCount === 4,
		'operator count must match Operator enum (4)'
	)
	invariant(
		t.minDurationSeconds >= 0 &&
			t.maxDurationSeconds > 0 &&
			t.maxDurationSeconds > t.minDurationSeconds,
		'duration range invalid'
	)
	invariant(
		t.incorrectPenaltyBase > 0 && t.incorrectPenaltySlownessFactor >= 0,
		'penalties must be positive'
	)
	invariant(
		t.correctGainBase > 0 && t.correctGainSpeedFactor > 0,
		'gains must be positive'
	)
	invariant(
		t.calibrationThreshold > 0 && t.calibrationThreshold < t.maxSkill,
		'calibration threshold out of range'
	)
	invariant(t.calibrationMaxBoost >= 1, 'calibration boost must be >= 1')
	invariant(
		t.taperThreshold > 0 && t.taperThreshold < t.maxSkill,
		'taper threshold out of range'
	)
	invariant(
		t.taperMinGain > 0 && t.taperMinGain <= 1,
		'taperMinGain must be in (0, 1]'
	)
	invariant(
		t.calibrationThreshold < t.taperThreshold,
		'calibration and taper zones must not overlap'
	)
	invariant(
		t.additionSubtractionMinUpperBound > 0 &&
			t.additionSubtractionUpperBoundBase > 0 &&
			t.additionSubtractionUpperBoundScale > 0 &&
			t.additionExponent > 0 &&
			t.subtractionExponent > 0 &&
			t.additionSubtractionLowerBoundScale >= 0 &&
			t.additionSubtractionLowerBoundScale < 1,
		'addition/subtraction range parameters invalid'
	)
	invariant(
		t.additionSubtractionSecondOperandSkillLag > 0 &&
			t.additionSubtractionSecondOperandSkillLag < t.maxSkill,
		'second operand skill lag must be positive and less than maxSkill'
	)
	invariant(
		t.adaptiveTablesBase >= 1 &&
			t.adaptiveTablesScale > 0 &&
			t.adaptiveTablesExponent > 0 &&
			t.adaptiveTablesDropScale >= 0 &&
			t.adaptiveTablesDropScale < 1,
		'adaptive tables parameters invalid'
	)
	invariant(
		t.mulDivFactorMin >= 1 &&
			t.mulDivFactorMax > t.mulDivFactorMin &&
			t.mulDivFactorMinAtMaxSkill >= t.mulDivFactorMin &&
			t.mulDivFactorMinAtMaxSkill <= t.mulDivFactorMax,
		'multiplication/division factor range parameters invalid'
	)
	invariant(
		t.adaptiveModeAlternateMidpoint > 0 &&
			t.adaptiveModeRandomMidpoint > t.adaptiveModeAlternateMidpoint &&
			t.adaptiveModeSpread > 0 &&
			t.adaptiveModeRandomMidpoint <= t.maxSkill,
		'puzzle mode midpoints invalid'
	)
	invariant(
		t.adaptiveNegativeAnswersThreshold > 0 &&
			t.adaptiveNegativeAnswersThreshold < t.maxSkill,
		'negative answers threshold out of range'
	)
	invariant(
		t.adaptiveAllWeightBase > t.maxSkill,
		'weight base must exceed maxSkill so no operator gets zero weight'
	)
	invariant(
		t.maxTableDifficultyScore > 0,
		'maxTableDifficultyScore must be positive'
	)
	invariant(
		t.addSubDifficultyBase > 0 &&
			t.addDifficultyScale > 0 &&
			t.subDifficultyScale > 0,
		'addition/subtraction difficulty parameters must be positive'
	)
	invariant(
		t.mulDivFactorWeight > 0 &&
			t.mulDivTableWeight > 0 &&
			t.mulDivFactorWeight + t.mulDivTableWeight === 1,
		'multiplication/division difficulty weights must be positive and sum to 1'
	)
	invariant(
		t.streakBoostThreshold > 0 && Number.isInteger(t.streakBoostThreshold),
		'streakBoostThreshold must be a positive integer'
	)
	invariant(t.streakBoostMultiplier >= 1, 'streakBoostMultiplier must be >= 1')
	invariant(
		t.incorrectCooldownSteps >= 0 && Number.isInteger(t.incorrectCooldownSteps),
		'incorrectCooldownSteps must be a non-negative integer'
	)
	invariant(
		t.incorrectCooldownRangeReduction >= 0 &&
			t.incorrectCooldownRangeReduction < 1,
		'incorrectCooldownRangeReduction must be in [0, 1)'
	)
	invariant(
		t.carryBorrowSkillThreshold >= 0 &&
			t.carryBorrowSkillThreshold <= t.maxSkill,
		'carryBorrowSkillThreshold must be in skill range'
	)
	invariant(
		t.maxDurationSecondsAtMaxSkill >= t.maxDurationSeconds,
		'maxDurationSecondsAtMaxSkill must be >= maxDurationSeconds'
	)
}
