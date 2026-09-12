import { describe, expect, it } from 'vitest'
import { adaptiveTuning } from '#lib/domain/skill-progression/adaptiveTuning.ts'
import { validateAdaptiveTuning } from '#lib/domain/skill-progression/adaptiveTuningValidation.ts'

describe('adaptiveTuning validation', () => {
	it('accepts the canonical tuning object without throwing', () => {
		expect(() => {
			validateAdaptiveTuning(adaptiveTuning)
		}).not.toThrow()
	})

	it('rejects a tuning object with an invalid skill range', () => {
		const invalidTuning = structuredClone(adaptiveTuning)
		invalidTuning.skillBounds.maxSkill = invalidTuning.skillBounds.minSkill

		expect(() => {
			validateAdaptiveTuning(invalidTuning)
		}).toThrow('skill range invalid')
	})

	it('rejects a tuning object with overlapping calibration and taper zones', () => {
		const invalidTuning = structuredClone(adaptiveTuning)
		invalidTuning.calibration.taperThreshold =
			invalidTuning.calibration.calibrationThreshold

		expect(() => {
			validateAdaptiveTuning(invalidTuning)
		}).toThrow('calibration and taper zones must not overlap')
	})
})
