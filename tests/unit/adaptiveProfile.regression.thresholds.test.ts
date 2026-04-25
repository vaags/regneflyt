import { describe, expect, it } from 'vitest'
import { getUpdatedSkill } from '$lib/helpers/adaptiveHelper'
import { adaptiveTuning } from '$lib/models/AdaptiveProfile'
import { getEffectiveMaxDuration } from './adaptiveProfile.regression.helpers'

describe('adaptiveProfile golden regressions: thresholds', () => {
	it('golden boundaries around difficulty ratio threshold remain stable', () => {
		const skill = 50
		const durationSeconds = 2
		const consecutiveCorrect = 1

		const deltas = [0.39, 0.4, 0.41].map(
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
		const skill = 50
		const ratio = 1
		const consecutiveCorrect = 1
		const [confidenceLowSpeedFraction, confidenceHighSpeedFraction] =
			adaptiveTuning.confidenceSpeedRange
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
		const durationSeconds = 2
		const ratio = 1
		const consecutiveCorrect = 1
		const deltas = [39, 40, 41, 59, 60, 61].map(
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
		const skill = 50
		const ratio = 1
		const effectiveMaxDuration = getEffectiveMaxDuration(skill)
		const gateDuration =
			effectiveMaxDuration * adaptiveTuning.streakBoostMaxSpeedFraction
		const cases = [
			{ durationSeconds: gateDuration + 0.01, consecutiveCorrect: 7 },
			{ durationSeconds: gateDuration + 0.01, consecutiveCorrect: 8 },
			{ durationSeconds: gateDuration, consecutiveCorrect: 8 },
			{ durationSeconds: gateDuration - 0.01, consecutiveCorrect: 8 }
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
