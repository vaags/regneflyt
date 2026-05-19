import { describe, expect, it } from 'vitest'
import { getUpdatedSkill } from '$lib/helpers/adaptiveSkillUpdate'
import { adaptiveTuning } from '$lib/models/AdaptiveProfile'
import { getEffectiveMaxDuration } from './adaptiveProfile.regression.helpers'

describe('adaptiveProfile golden regressions: thresholds', () => {
	it('golden boundaries around difficulty ratio threshold remain stable', () => {
		// Difficulty ratio threshold (0.4):
		// Expected deltas around minDifficultyThreshold transition:
		// - ratio < 0.4 (trivial): delta = 0 (no skill gain)
		// - ratio = 0.4 (just met): delta = 1 (minimum skill gain)
		// - ratio > 0.4 (worthwhile): delta scales with base gain
		// See docs/ADAPTIVE_ALGORITHM.md#difficulty-ratio-gate for rationale.
		const skill = 50
		const durationSeconds = 2
		const consecutiveCorrect = 1
		const epsilon = 0.01
		const ratioThreshold = adaptiveTuning.thresholds.minDifficultyThreshold

		const deltas = [
			ratioThreshold - epsilon,
			ratioThreshold,
			ratioThreshold + epsilon
		].map(
			(difficultyRatio) =>
				getUpdatedSkill(
					skill,
					true,
					durationSeconds,
					difficultyRatio,
					consecutiveCorrect
				) - skill
		)

		expect(deltas).toEqual([0, 1, 1])
	})

	it('golden boundaries around confidence speed bands remain stable', () => {
		// Confidence speed bands (35%, 75%):
		// Speed feedback ranges scale confidence between 0.9–1.1.
		// At 0%, 35%, 75%, 100%, confidence is 0.9, 1.0, 1.0, 1.1 respectively.
		// Delta expectations stable across these boundaries (no sudden jumps).
		// See docs/ADAPTIVE_ALGORITHM.md#confidence-multiplier for rationale.
		const skill = 50
		const ratio = 1
		const consecutiveCorrect = 1
		const [confidenceLowSpeedFraction, confidenceHighSpeedFraction] =
			adaptiveTuning.gains.confidenceSpeedRange
		const effectiveMaxDuration = getEffectiveMaxDuration(skill)
		const lowBandDuration =
			effectiveMaxDuration * (1 - confidenceLowSpeedFraction)
		const highBandDuration =
			effectiveMaxDuration * (1 - confidenceHighSpeedFraction)

		const durations = [
			lowBandDuration + 0.01,
			lowBandDuration,
			lowBandDuration - 0.01,
			highBandDuration + 0.01,
			highBandDuration,
			highBandDuration - 0.01
		]

		const deltas = durations.map(
			(durationSeconds) =>
				getUpdatedSkill(
					skill,
					true,
					durationSeconds,
					ratio,
					consecutiveCorrect
				) - skill
		)

		expect(deltas).toEqual([1, 1, 1, 3, 3, 3])
	})

	it('golden boundaries around calibration and taper thresholds remain stable', () => {
		// Calibration and taper thresholds (skill 40 and 60):
		// Calibration boost (1.1×) fades from skill 0 to 50.
		// High-skill taper (0.35× at skill 100) begins at skill 60.
		// At skill=50 (between thresholds), both multipliers are ~1.0.
		// Delta expectations stable across boundaries; smooth transitions prevent discontinuities.
		// See docs/ADAPTIVE_ALGORITHM.md#calibration-multiplier and #high-skill-taper.
		const durationSeconds = 2
		const ratio = 1
		const consecutiveCorrect = 1
		const deltas = [
			adaptiveTuning.calibration.calibrationThreshold - 1,
			adaptiveTuning.calibration.calibrationThreshold,
			adaptiveTuning.calibration.calibrationThreshold + 1,
			adaptiveTuning.calibration.taperThreshold - 1,
			adaptiveTuning.calibration.taperThreshold,
			adaptiveTuning.calibration.taperThreshold + 1
		].map(
			(skill) =>
				getUpdatedSkill(
					skill,
					true,
					durationSeconds,
					ratio,
					consecutiveCorrect
				) - skill
		)

		expect(deltas).toEqual([3, 3, 3, 3, 3, 3])
	})

	it('golden streak gate boundaries remain stable', () => {
		// Streak bonus (1.25×) activates ONLY when BOTH conditions are met:
		// 1. Consecutive correct answers ≥ 8 (streakBoostThreshold)
		// 2. Solve time ≤ 65% of max time (streakBoostMaxSpeedFraction)
		// This prevents grinding on hard but slow puzzles from boosting gains.
		// Expected deltas: [no streak, no streak, streak, streak] = [1, 1, 2, 2]
		// See docs/ADAPTIVE_ALGORITHM.md#streak-bonus for rationale.
		const skill = 50
		const ratio = 1
		const effectiveMaxDuration = getEffectiveMaxDuration(skill)
		const gateDuration =
			effectiveMaxDuration * adaptiveTuning.streak.streakBoostMaxSpeedFraction
		const cases = [
			{
				durationSeconds: gateDuration + 0.01,
				consecutiveCorrect: adaptiveTuning.streak.streakBoostThreshold - 1
			},
			{
				durationSeconds: gateDuration + 0.01,
				consecutiveCorrect: adaptiveTuning.streak.streakBoostThreshold
			},
			{
				durationSeconds: gateDuration,
				consecutiveCorrect: adaptiveTuning.streak.streakBoostThreshold
			},
			{
				durationSeconds: gateDuration - 0.01,
				consecutiveCorrect: adaptiveTuning.streak.streakBoostThreshold
			}
		]

		const deltas = cases.map(
			({ durationSeconds, consecutiveCorrect }) =>
				getUpdatedSkill(
					skill,
					true,
					durationSeconds,
					ratio,
					consecutiveCorrect
				) - skill
		)

		expect(deltas).toEqual([1, 1, 2, 2])
	})
})
