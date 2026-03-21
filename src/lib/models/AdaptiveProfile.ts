import { invariant } from '$lib/helpers/assertions'

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
	// slow correct answers earn only base. Fractional base (< 1) means
	// max-time answers floor to 0 gain — some speed is required to progress.
	correctGainBase: 0.9,
	correctGainSpeedFactor: 3,
	// At low skill, speed matters less — answering 2+3 fast is cheap.
	// Linearly ramps from this value at skill 0 to full speedFactor at
	// calibrationThreshold, so the bonus grows as puzzles get harder.
	correctGainSpeedFactorAtMinSkill: 1.5,
	// Boost gain after N consecutive correct answers — rewards sustained focus.
	streakBoostThreshold: 8,
	streakBoostMultiplier: 1.3,
	// Streak bonus only applies when the answer is faster than this fraction
	// of max time. A streak of slow correct answers shows patience, not fluency.
	streakBoostMaxSpeedFraction: 0.65,
	// Below this skill, gains are boosted so players don't feel stuck
	// in the early levels where everything is trivially easy.
	calibrationThreshold: 40,
	calibrationMaxBoost: 1.1,
	// Above this skill, gains taper down so the last stretch feels earned.
	// At maxSkill the multiplier drops to taperMinGain (e.g. 0.35 = 35% of normal).
	taperThreshold: 60,
	taperMinGain: 0.35,
	// Addition/subtraction range grows on a power curve so low-skill
	// players stay in single digits while high-skill players reach 100.
	additionSubtractionMinUpperBound: 5,
	additionSubtractionUpperBoundBase: 5,
	additionSubtractionUpperBoundScale: 95,
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
	// Reject generated puzzles whose difficulty is below this fraction of the
	// player's skill. Prevents trivially easy puzzles (e.g. 20+3 at skill 40)
	// caused by round-number trailing-zero stripping in scoring.
	minDifficultyFraction: 0.4,
	// Puzzles with a difficulty ratio below this threshold grant no skill on
	// correct answers. Prevents skill inflation from replaying or sharing
	// easy puzzles. Wrong answers still penalise.
	minDifficultyRatioForGain: 0.5,
	// Multiplication tables unlocked: starts at 2 easiest, scales to 14.
	// Sub-linear exponent (<1) front-loads harder tables so mid-skill
	// players encounter 6×, 7×, 8× sooner, keeping difficulty aligned.
	adaptiveTablesBase: 2,
	adaptiveTablesScale: 12,
	adaptiveTablesExponent: 0.9,
	// Gradually drops the easiest tables so advanced players aren't
	// still grinding 1× and 2× when they've unlocked 12×.
	adaptiveTablesDropScale: 0.45,
	// Second factor for ×/÷ puzzles: both ends of the range scale with skill.
	// At skill 0 the range is [1, maxAtMinSkill]; at skill 100 it becomes
	// [minAtMaxSkill, max]. This prevents beginners from getting large
	// factors that inflate difficulty and avoids trivial ×1/×2 at high skill.
	mulDivFactorMin: 1,
	mulDivFactorMax: 10,
	mulDivFactorMinAtMaxSkill: 5,
	mulDivFactorMaxAtMinSkill: 6,
	// Puzzle presentation — probability-based blending of Normal (a+b=?),
	// Alternate (a+?=c), and Random (?+b=c). Midpoints control where each
	// harder mode reaches 50% probability; spread controls the transition width.
	adaptiveModeAlternateMidpoint: 35,
	adaptiveModeRandomMidpoint: 60,
	adaptiveModeSpread: 10,
	// Subtraction skill must reach this level before negative answers appear.
	adaptiveNegativeAnswersThreshold: 60,
	// Puzzle difficulty scoring — maps intrinsic puzzle hardness to the 0–100 skill scale.
	// +/− uses the inverse of the adaptive power curve; ×/÷ uses tableDifficultyScores.	// The smaller operand's weight in the blend. At 0 only the max operand matters
	// (old behaviour); at 0.5 it's a pure average. 0.4 gives meaningful
	// differentiation (e.g. 28+3 scores noticeably less than 28+25) without
	// creating a progression wall at high skill.
	addSubMinorOperandWeight: 0.4,
	// Multiplicative boost per carry (addition) or borrow (subtraction).
	// Puzzles requiring carries/borrows are harder than those that don't,
	// even with the same operand magnitudes.
	addSubCarryBorrowBoost: 0.15,
	// Discount applied when a +/− puzzle has zero carries/borrows.
	// No-carry puzzles (e.g. 20+9) are easier than their operand size
	// suggests, so their difficulty is reduced by this fraction.
	addSubNoCarryDiscount: 0.1,
	maxTableDifficultyScore: 68,
	addSubDifficultyBase: 1,
	// Scale for mapping effective operand to difficulty 0–100.
	// Calibrated to the blended operand (major×0.6 + minor×0.4) with
	// the secondary range lagging by 15 skill points, so that the median
	// puzzle at each skill scores close to that skill level.
	addDifficultyScale: 65,
	// Subtraction has a lower max range (100 vs 100), so it needs its own scale
	// to ensure the hardest subtraction puzzles score close to difficulty 100.
	subDifficultyScale: 50,
	mulDivFactorWeight: 0.4,
	mulDivTableWeight: 0.6,
	// Sub-linear exponent applied to the raw ×/÷ difficulty score.
	// Stretches the mid-range so median difficulty tracks skill more
	// closely at skill 50–80 where the discrete table set otherwise
	// creates a structural ceiling.
	mulDivDifficultyExponent: 0.85
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
		t.correctGainBase > 0 &&
			t.correctGainSpeedFactor > 0 &&
			t.correctGainSpeedFactorAtMinSkill > 0 &&
			t.correctGainSpeedFactorAtMinSkill <= t.correctGainSpeedFactor,
		'gains must be positive and minSkill speed factor must not exceed max'
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
		t.streakBoostMaxSpeedFraction > 0 && t.streakBoostMaxSpeedFraction <= 1,
		'streakBoostMaxSpeedFraction must be in (0, 1]'
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
			t.mulDivFactorMinAtMaxSkill <= t.mulDivFactorMax &&
			t.mulDivFactorMaxAtMinSkill >= t.mulDivFactorMin &&
			t.mulDivFactorMaxAtMinSkill <= t.mulDivFactorMax,
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
		t.addSubMinorOperandWeight >= 0 && t.addSubMinorOperandWeight <= 0.5,
		'addSubMinorOperandWeight must be in [0, 0.5]'
	)
	invariant(
		t.addSubCarryBorrowBoost >= 0 && t.addSubCarryBorrowBoost <= 0.5,
		'addSubCarryBorrowBoost must be in [0, 0.5]'
	)
	invariant(
		t.addSubNoCarryDiscount >= 0 && t.addSubNoCarryDiscount < 1,
		'addSubNoCarryDiscount must be in [0, 1)'
	)
	invariant(
		t.addSubDifficultyBase > 0 &&
			t.addDifficultyScale > 0 &&
			t.subDifficultyScale > 0,
		'addition/subtraction difficulty parameters must be positive'
	)
	// Scale must be smaller than the theoretical max effective operand,
	// otherwise difficulty 100 is unreachable. The max operand from the
	// range formula is upperBoundBase + upperBoundScale; the effective
	// blend is always ≤ that. If this fires, addDifficultyScale or
	// subDifficultyScale needs recalibrating (run the alignment test).
	invariant(
		t.addDifficultyScale <
			t.additionSubtractionUpperBoundBase +
				t.additionSubtractionUpperBoundScale -
				t.addSubDifficultyBase &&
			t.subDifficultyScale <
				t.additionSubtractionUpperBoundBase +
					t.additionSubtractionUpperBoundScale -
					t.addSubDifficultyBase,
		'difficulty scale exceeds max operand range — difficulty 100 would be unreachable'
	)
	invariant(
		t.mulDivFactorWeight > 0 &&
			t.mulDivTableWeight > 0 &&
			t.mulDivFactorWeight + t.mulDivTableWeight === 1,
		'multiplication/division difficulty weights must be positive and sum to 1'
	)
	invariant(
		t.mulDivDifficultyExponent > 0 && t.mulDivDifficultyExponent <= 1,
		'mulDivDifficultyExponent must be in (0, 1]'
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
		t.minDifficultyFraction >= 0 && t.minDifficultyFraction < 1,
		'minDifficultyFraction must be in [0, 1)'
	)
	invariant(
		t.maxDurationSecondsAtMaxSkill >= t.maxDurationSeconds,
		'maxDurationSecondsAtMaxSkill must be >= maxDurationSeconds'
	)
}
