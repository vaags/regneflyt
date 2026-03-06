import { describe, expect, it } from 'vitest'
import { adaptiveTuning } from '../../src/models/AdaptiveProfile'

/**
 * Guards against accidentally breaking the adaptive engine by entering
 * an invalid tuning value. Each constraint documents *why* the bound
 * exists — if a test fails, read the comment before changing the limit.
 */
describe('adaptiveTuning constraints', () => {
	// --- Skill bounds ---

	it('skill range is valid', () => {
		expect(adaptiveTuning.minSkill).toBeGreaterThanOrEqual(0)
		expect(adaptiveTuning.maxSkill).toBeGreaterThan(adaptiveTuning.minSkill)
	})

	it('operator count matches the Operator enum (4)', () => {
		// AdaptiveSkillMap is a 4-tuple, and Operator has 4 members.
		// Changing this without updating the tuple type causes out-of-bounds access.
		expect(adaptiveTuning.adaptiveAllOperatorCount).toBe(4)
	})

	// --- Duration ---

	it('duration range is valid and non-zero denominator', () => {
		expect(adaptiveTuning.minDurationSeconds).toBeGreaterThanOrEqual(0)
		// maxDurationSeconds is used as a divisor — must be positive
		expect(adaptiveTuning.maxDurationSeconds).toBeGreaterThan(0)
		expect(adaptiveTuning.maxDurationSeconds).toBeGreaterThan(
			adaptiveTuning.minDurationSeconds
		)
	})

	// --- Penalties ---

	it('penalties are positive so wrong answers always reduce skill', () => {
		expect(adaptiveTuning.timeoutPenalty).toBeGreaterThan(0)
		expect(adaptiveTuning.incorrectPenaltyBase).toBeGreaterThan(0)
		expect(
			adaptiveTuning.incorrectPenaltySlownessFactor
		).toBeGreaterThanOrEqual(0)
	})

	it('timeout penalty is at least as harsh as the worst incorrect penalty', () => {
		// Max incorrect penalty = base + slownessFactor (when slowness = 1.0)
		const maxIncorrectPenalty =
			adaptiveTuning.incorrectPenaltyBase +
			adaptiveTuning.incorrectPenaltySlownessFactor
		expect(adaptiveTuning.timeoutPenalty).toBeGreaterThanOrEqual(
			maxIncorrectPenalty
		)
	})

	// --- Gains ---

	it('correct gains are positive so correct answers always help', () => {
		expect(adaptiveTuning.correctGainBase).toBeGreaterThan(0)
		expect(adaptiveTuning.correctGainSpeedFactor).toBeGreaterThan(0)
	})

	// --- Calibration boost ---

	it('calibration boost accelerates early progress without inverting it', () => {
		// Threshold must be positive to avoid division by zero
		expect(adaptiveTuning.calibrationThreshold).toBeGreaterThan(0)
		expect(adaptiveTuning.calibrationThreshold).toBeLessThan(
			adaptiveTuning.maxSkill
		)
		// Boost >= 1 means it always helps, never slows down beginners
		expect(adaptiveTuning.calibrationMaxBoost).toBeGreaterThanOrEqual(1)
	})

	// --- High-skill taper ---

	it('taper reduces gain at high skill without inverting it', () => {
		// Threshold must be below maxSkill to avoid division by zero
		expect(adaptiveTuning.taperThreshold).toBeLessThan(adaptiveTuning.maxSkill)
		expect(adaptiveTuning.taperThreshold).toBeGreaterThan(0)
		// taperMinGain in (0, 1] — positive so gains never go negative,
		// at most 1 so taper never becomes a boost
		expect(adaptiveTuning.taperMinGain).toBeGreaterThan(0)
		expect(adaptiveTuning.taperMinGain).toBeLessThanOrEqual(1)
	})

	it('calibration and taper zones do not overlap', () => {
		// If they overlap, a skill value could be both boosted and tapered,
		// making the interaction confusing and hard to reason about.
		expect(adaptiveTuning.calibrationThreshold).toBeLessThanOrEqual(
			adaptiveTuning.taperThreshold
		)
	})

	// --- Addition/subtraction ranges ---

	it('addition/subtraction range parameters produce valid ranges', () => {
		expect(adaptiveTuning.additionSubtractionMinUpperBound).toBeGreaterThan(0)
		expect(adaptiveTuning.additionSubtractionUpperBoundBase).toBeGreaterThan(0)
		expect(adaptiveTuning.additionSubtractionUpperBoundScale).toBeGreaterThan(0)
		// Exponent > 0 ensures the curve rises with skill (not inverted)
		expect(
			adaptiveTuning.additionSubtractionUpperBoundExponent
		).toBeGreaterThan(0)
		// Lower bound scale in [0, 1) — at 1.0 the lower bound matches the upper
		expect(
			adaptiveTuning.additionSubtractionLowerBoundScale
		).toBeGreaterThanOrEqual(0)
		expect(adaptiveTuning.additionSubtractionLowerBoundScale).toBeLessThan(1)
	})

	// --- Custom range window ---

	it('custom range window ratios are valid', () => {
		expect(adaptiveTuning.customRangeWindowBaseRatio).toBeGreaterThan(0)
		expect(adaptiveTuning.customRangeWindowScaleRatio).toBeGreaterThan(0)
		// At max skill the window should cover at most 100% of the user's range
		const maxRatio =
			adaptiveTuning.customRangeWindowBaseRatio +
			adaptiveTuning.customRangeWindowScaleRatio
		expect(maxRatio).toBeLessThanOrEqual(1)
	})

	// --- Multiplication tables ---

	it('adaptive tables parameters produce non-empty table sets', () => {
		// Base must be >= 1 so skill-0 players get at least one table
		expect(adaptiveTuning.adaptiveTablesBase).toBeGreaterThanOrEqual(1)
		expect(adaptiveTuning.adaptiveTablesScale).toBeGreaterThan(0)
		// Drop scale in [0, 1) — at 1.0 all tables are dropped at max skill
		expect(adaptiveTuning.adaptiveTablesDropScale).toBeGreaterThanOrEqual(0)
		expect(adaptiveTuning.adaptiveTablesDropScale).toBeLessThan(1)
	})

	// --- Puzzle mode thresholds ---

	it('puzzle mode thresholds are ordered with room for hysteresis', () => {
		const {
			adaptiveModeAlternateThreshold: alt,
			adaptiveModeRandomThreshold: rnd,
			adaptiveModeHysteresis: hyst
		} = adaptiveTuning

		expect(alt).toBeGreaterThan(0)
		expect(rnd).toBeGreaterThan(alt)
		expect(hyst).toBeGreaterThanOrEqual(0)
		// Hysteresis must fit between the two thresholds so zones don't overlap
		expect(hyst * 2).toBeLessThan(rnd - alt)
		// Random threshold must be reachable
		expect(rnd + hyst).toBeLessThanOrEqual(adaptiveTuning.maxSkill)
	})

	// --- Weighted operator selection ---

	it('operator weight base is large enough for meaningful differentiation', () => {
		// Must exceed maxSkill so that even a maxed-out operator still gets
		// some weight (adaptiveAllWeightBase - 100 > 0)
		expect(adaptiveTuning.adaptiveAllWeightBase).toBeGreaterThan(
			adaptiveTuning.maxSkill
		)
	})
})
