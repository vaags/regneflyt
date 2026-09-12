import { describe, expect, it } from 'vitest'
import { Operator } from '#lib/domain/arithmetic/operator.ts'
import type { PuzzlePartSet } from '#lib/domain/puzzle-generation/puzzle.ts'
import {
	createRng,
	nextFloat,
	nextInt
} from '#lib/domain/puzzle-generation/random.ts'
import {
	getDifficultyRatio,
	getPuzzleDifficulty
} from '#lib/domain/puzzle-generation/puzzleDifficulty.ts'
import { adaptiveTuning } from '#lib/domain/skill-progression/adaptiveTuning.ts'
import { getUpdatedSkill } from '#lib/domain/skill-progression/skillUpdate.ts'

const FUZZ_ITERATIONS = 100
const createFuzzHelpers = (seed: number) => {
	const rng = createRng(seed).rng
	return {
		randomBool: (threshold = 0.5) => nextFloat(rng) > threshold,
		randomFloat: (min: number, max: number) =>
			nextFloat(rng) * (max - min) + min,
		randomInt: (min: number, max: number) => nextInt(rng, min, max)
	}
}

describe('skillUpdate', () => {
	it('gains skill on correct, loses on incorrect', () => {
		// Correct answer increases skill
		expect(getUpdatedSkill(20, true, 2)).toBeGreaterThan(20)

		// Incorrect answer decreases skill
		expect(getUpdatedSkill(20, false, 3)).toBeLessThan(20)
	})

	it('penalizes slow incorrect answers more than fast ones', () => {
		const fastMiss = getUpdatedSkill(50, false, 1)
		const slowMiss = getUpdatedSkill(50, false, 11)
		expect(fastMiss).toBeGreaterThan(slowMiss)
		expect(fastMiss).toBeLessThan(50)
		expect(slowMiss).toBeLessThan(50)
	})

	it('caps low-skill penalties to avoid hard resets', () => {
		// At skill 4, the raw penalty would normally reset to 0.
		// The low-skill cap keeps at least half the progress.
		expect(getUpdatedSkill(4, false, 3)).toBe(2)

		// At skill 8, the cap matches the current raw penalty, so behavior is unchanged.
		expect(getUpdatedSkill(8, false, 3)).toBe(4)
	})

	it('does not apply low-skill penalty cap at or above threshold', () => {
		// Threshold is strict (< 10), so skill 10 follows the original penalty curve.
		expect(getUpdatedSkill(10, false, 3)).toBe(6)
		expect(getUpdatedSkill(20, false, 3)).toBe(16)
	})

	it('caps skill to valid range', () => {
		// Best-case correct answer at 99 must still reach 100
		expect(getUpdatedSkill(99, true, 0)).toBeLessThanOrEqual(100)
		expect(getUpdatedSkill(99, true, 0)).toBeGreaterThanOrEqual(99)
		// Skill floor should remain stable on wrong answers
		expect(getUpdatedSkill(0, false, 5)).toBe(0)
	})

	it('applies calibration boost for low-skill correct answers', () => {
		// At low skill, gains are positive (forward progress)
		const lowSkillGain = getUpdatedSkill(0, true, 0.5)
		expect(lowSkillGain).toBeGreaterThan(0)

		// Speed-scaled gain at low skill is intentionally below mid-skill gain
		// to prevent rapid ramp-up on trivially easy puzzles
		const midSkillGain = getUpdatedSkill(50, true, 0.5) - 50
		expect(midSkillGain).toBeGreaterThan(0)
	})

	it('guarantees at least +1 for any correct answer above difficulty threshold', () => {
		// Slow answers at low skill previously floored to +0 due to Math.floor.
		// The minimum-gain guarantee ensures every valid correct answer
		// yields at least +1 so progression always feels rewarding.
		for (const skill of [0, 5, 10, 20, 50, 80, 95]) {
			for (const duration of [0, 1, 3, 6, 10]) {
				for (const ratio of [0.4, 0.6, 0.8, 1.0]) {
					const gain = getUpdatedSkill(skill, true, duration, ratio) - skill
					expect(
						gain,
						`skill=${skill} duration=${duration}s ratio=${ratio}: gain must be ≥1`
					).toBeGreaterThanOrEqual(1)
				}
			}
		}
	})

	it('still grants zero gain for puzzles below difficulty threshold', () => {
		// Puzzles far below the player's level should still yield no gain
		const gain = getUpdatedSkill(50, true, 2, 0.3) - 50
		expect(gain).toBe(0)
	})

	it('calibration boost does not overshoot mid-skill gains', () => {
		const lowSkillGain = getUpdatedSkill(0, true, 0.5)
		const midSkillGain = getUpdatedSkill(50, true, 0.5) - 50
		expect(lowSkillGain).toBeLessThanOrEqual(midSkillGain)

		// Penalties should not be boosted — low-skill penalty ≤ high-skill penalty
		const lowSkillPenalty = 10 - getUpdatedSkill(10, false, 2)
		const highSkillPenalty = 50 - getUpdatedSkill(50, false, 2)
		expect(lowSkillPenalty).toBeLessThanOrEqual(highSkillPenalty)
	})

	it('tapers gain at high skill so reaching 100 requires sustained performance', () => {
		const midGain = getUpdatedSkill(50, true, 2) - 50
		const highGain = getUpdatedSkill(80, true, 2) - 80
		const topGain = getUpdatedSkill(95, true, 2) - 95

		// Gain should decrease as skill rises above the taper threshold
		expect(midGain).toBeGreaterThan(highGain)
		expect(highGain).toBeGreaterThan(topGain)

		// All should still be positive — correct answers always help
		expect(topGain).toBeGreaterThan(0)

		// Penalties are not tapered — high-skill wrong answers still hurt the same
		const midPenalty = 50 - getUpdatedSkill(50, false, 3)
		const highPenalty = 80 - getUpdatedSkill(80, false, 3)
		expect(midPenalty).toBe(highPenalty)
	})

	it('grants no skill for correct answers on puzzles well below current skill', () => {
		// difficultyRatio below threshold → no gain
		const lowRatio = 0.1
		expect(getUpdatedSkill(50, true, 2, lowRatio)).toBe(50)

		// difficultyRatio just under threshold → still no gain
		const atThreshold = 0.39
		expect(getUpdatedSkill(50, true, 2, atThreshold)).toBe(50)

		// difficultyRatio above threshold → gains skill
		const aboveThreshold = 0.5
		expect(getUpdatedSkill(50, true, 2, aboveThreshold)).toBeGreaterThan(50)

		// Wrong answers still penalise even with low ratio
		expect(getUpdatedSkill(50, false, 2, lowRatio)).toBeLessThan(50)
	})

	it('scales gains down for easy puzzles via difficultyRatio', () => {
		const fullGain = getUpdatedSkill(50, true, 2, 1.0) - 50
		const halfGain = getUpdatedSkill(50, true, 2, 0.5) - 50
		const zeroGain = getUpdatedSkill(50, true, 2, 0.0) - 50

		expect(fullGain).toBeGreaterThan(0)
		expect(halfGain).toBeGreaterThanOrEqual(0)
		expect(halfGain).toBeLessThan(fullGain)
		expect(zeroGain).toBe(0)
	})

	it('does not scale penalties by difficultyRatio', () => {
		// Wrong answers should always penalize fully regardless of difficulty
		const fullPenalty = 50 - getUpdatedSkill(50, false, 3, 1.0)
		const lowRatioPenalty = 50 - getUpdatedSkill(50, false, 3, 0.1)

		expect(fullPenalty).toBe(lowRatioPenalty)
	})

	it('prevents trivial custom puzzles from inflating skill', () => {
		// Simulate: player at skill 60 answering 1+2=3 repeatedly
		const trivialParts: PuzzlePartSet = [
			{ generatedValue: 1, userDefinedValue: undefined },
			{ generatedValue: 2, userDefinedValue: undefined },
			{ generatedValue: 3, userDefinedValue: undefined }
		] as PuzzlePartSet

		let skill = 60
		for (let i = 0; i < 20; i++) {
			const difficulty = getPuzzleDifficulty(Operator.Addition, trivialParts)
			const ratio = getDifficultyRatio(difficulty, skill)
			skill = getUpdatedSkill(skill, true, 1, ratio)
		}

		// After 20 trivial puzzles at skill 60, should barely move
		expect(skill).toBeLessThan(65)
	})

	it('allows progression at very high skill with fast correct answers', () => {
		// Regression: a double-floor bug caused skill 97+ to be an impassable wall
		// because floor(scaledDelta) × floor(ratio) always rounded to 0.
		const gain97fast = getUpdatedSkill(97, true, 1, 0.9) - 97
		const gain99fast = getUpdatedSkill(99, true, 1, 0.9) - 99

		expect(gain97fast).toBeGreaterThan(0)
		expect(gain99fast).toBeGreaterThan(0)

		// Slow answers at 97+ still gain minimally (minimum +1 guarantee)
		const gain97slow = getUpdatedSkill(97, true, 4, 0.9) - 97
		expect(gain97slow).toBeGreaterThanOrEqual(1)
		expect(gain97slow).toBeLessThanOrEqual(gain97fast)
	})

	it('fuzz: getUpdatedSkill always returns an integer in [0, 100]', () => {
		const { randomBool, randomFloat, randomInt } = createFuzzHelpers(91_337)
		for (let i = 0; i < FUZZ_ITERATIONS; i++) {
			const skill = randomInt(-50, 150)
			const isCorrect = randomBool()
			const duration = randomFloat(-5, 30)
			const ratio = randomFloat(-1, 2)

			const result = getUpdatedSkill(skill, isCorrect, duration, ratio)

			expect(Number.isFinite(result)).toBe(true)
			expect(Number.isInteger(result)).toBe(true)
			expect(result).toBeGreaterThanOrEqual(0)
			expect(result).toBeLessThanOrEqual(100)
		}
	})

	it('fuzz: correct answers never decrease skill', () => {
		const { randomFloat, randomInt } = createFuzzHelpers(91_338)
		for (let i = 0; i < FUZZ_ITERATIONS; i++) {
			const skill = randomInt(0, 100)
			const duration = randomFloat(0, 15)
			const ratio = randomFloat(0, 1)

			const result = getUpdatedSkill(skill, true, duration, ratio)
			expect(result).toBeGreaterThanOrEqual(skill)
		}
	})

	it('fuzz: incorrect answers never increase skill', () => {
		const { randomFloat, randomInt } = createFuzzHelpers(91_339)
		for (let i = 0; i < FUZZ_ITERATIONS; i++) {
			const skill = randomInt(0, 100)
			const duration = randomFloat(0, 15)

			const result = getUpdatedSkill(skill, false, duration)
			expect(result).toBeLessThanOrEqual(skill)
		}
	})

	it('boosts gain after a streak of consecutive correct answers', () => {
		const noStreakGain = getUpdatedSkill(40, true, 1, 1, 0) - 40
		const belowThresholdGain = getUpdatedSkill(40, true, 1, 1, 7) - 40
		const streakGain = getUpdatedSkill(40, true, 1, 1, 8) - 40

		// Below threshold — no boost
		expect(belowThresholdGain).toBe(noStreakGain)

		// At threshold — boosted
		expect(streakGain).toBeGreaterThan(noStreakGain)
	})

	it('applies confidence multipliers across low, mid, and high speed bands', () => {
		const skill = 50
		const ratio = 1

		const lowConfidenceGain = getUpdatedSkill(skill, true, 6, ratio) - skill
		const midConfidenceGain = getUpdatedSkill(skill, true, 3, ratio) - skill
		const highConfidenceGain = getUpdatedSkill(skill, true, 1, ratio) - skill

		expect(midConfidenceGain).toBeGreaterThanOrEqual(lowConfidenceGain)
		expect(highConfidenceGain).toBeGreaterThanOrEqual(midConfidenceGain)
	})

	it('keeps gain monotonic as confidence increases for identical inputs', () => {
		const skill = 55
		const ratio = 1
		const durations = [6, 5, 4, 3, 2, 1]

		const gains = durations.map(
			(duration) => getUpdatedSkill(skill, true, duration, ratio) - skill
		)

		for (let i = 1; i < gains.length; i++) {
			expect(gains[i]).toBeGreaterThanOrEqual(gains[i - 1]!)
		}
	})

	it('keeps gain progression smooth at confidence threshold boundaries', () => {
		const skill = 50
		const ratio = 1
		const [confidenceLowSpeedFraction, confidenceHighSpeedFraction] =
			adaptiveTuning.gains.confidenceSpeedBands
		const effectiveMaxDuration =
			adaptiveTuning.timing.maxDurationSeconds +
			(adaptiveTuning.timing.maxDurationAtMaxSkill -
				adaptiveTuning.timing.maxDurationSeconds) *
				(skill / adaptiveTuning.skillBounds.maxSkill)

		const lowThresholdDuration =
			effectiveMaxDuration * (1 - confidenceLowSpeedFraction)
		const highThresholdDuration =
			effectiveMaxDuration * (1 - confidenceHighSpeedFraction)

		const gainJustBelowLow =
			getUpdatedSkill(skill, true, lowThresholdDuration + 0.01, ratio) - skill
		const gainAtLow =
			getUpdatedSkill(skill, true, lowThresholdDuration, ratio) - skill
		const gainJustAboveLow =
			getUpdatedSkill(skill, true, lowThresholdDuration - 0.01, ratio) - skill

		const gainJustBelowHigh =
			getUpdatedSkill(skill, true, highThresholdDuration + 0.01, ratio) - skill
		const gainAtHigh =
			getUpdatedSkill(skill, true, highThresholdDuration, ratio) - skill
		const gainJustAboveHigh =
			getUpdatedSkill(skill, true, highThresholdDuration - 0.01, ratio) - skill

		expect(gainAtLow).toBeGreaterThanOrEqual(gainJustBelowLow)
		expect(gainJustAboveLow).toBeGreaterThanOrEqual(gainAtLow)
		expect(gainAtHigh).toBeGreaterThanOrEqual(gainJustBelowHigh)
		expect(gainJustAboveHigh).toBeGreaterThanOrEqual(gainAtHigh)
		// Flooring can introduce 1-point steps, but not larger cliffs at boundaries.
		expect(Math.abs(gainAtLow - gainJustBelowLow)).toBeLessThanOrEqual(1)
		expect(Math.abs(gainJustAboveLow - gainAtLow)).toBeLessThanOrEqual(1)
		expect(Math.abs(gainAtHigh - gainJustBelowHigh)).toBeLessThanOrEqual(1)
		expect(Math.abs(gainJustAboveHigh - gainAtHigh)).toBeLessThanOrEqual(1)
	})

	it('handles exact confidence threshold durations without gain regressions', () => {
		const skill = 50
		const ratio = 1
		const [confidenceLowSpeedFraction, confidenceHighSpeedFraction] =
			adaptiveTuning.gains.confidenceSpeedBands
		const effectiveMaxDuration =
			adaptiveTuning.timing.maxDurationSeconds +
			(adaptiveTuning.timing.maxDurationAtMaxSkill -
				adaptiveTuning.timing.maxDurationSeconds) *
				(skill / adaptiveTuning.skillBounds.maxSkill)

		const lowThresholdDuration =
			effectiveMaxDuration * (1 - confidenceLowSpeedFraction)
		const highThresholdDuration =
			effectiveMaxDuration * (1 - confidenceHighSpeedFraction)

		const gainAtLowThreshold =
			getUpdatedSkill(skill, true, lowThresholdDuration, ratio) - skill
		const gainAtHighThreshold =
			getUpdatedSkill(skill, true, highThresholdDuration, ratio) - skill

		const gainAtSlowest =
			getUpdatedSkill(skill, true, effectiveMaxDuration, ratio) - skill
		const gainAtFastest = getUpdatedSkill(skill, true, 0, ratio) - skill

		// Exact-threshold gains should sit within the normal low→high confidence envelope.
		expect(gainAtLowThreshold).toBeGreaterThanOrEqual(gainAtSlowest)
		expect(gainAtHighThreshold).toBeGreaterThanOrEqual(gainAtLowThreshold)
		expect(gainAtFastest).toBeGreaterThanOrEqual(gainAtHighThreshold)
	})

	it('scales max answer duration with skill level', () => {
		// At skill 0: effectiveMax = 6s, so a 7s answer is clamped to 6
		// At skill 100: effectiveMax = 8s, so a 7s answer is within bounds
		// Faster effective speed at high skill means less penalty for same absolute time
		const penaltyLowSkill = 10 - getUpdatedSkill(10, false, 7)
		const penaltyHighSkill = 80 - getUpdatedSkill(80, false, 7)

		// At low skill, 7s is clamped to maxDurationSeconds (6), so maximum slowness = 1.0
		// At high skill, 7s is well within effectiveMax (~7.6), so slowness < 1.0
		expect(penaltyLowSkill).toBeGreaterThanOrEqual(penaltyHighSkill)
	})
})
