import { describe, expect, it } from 'vitest'
import { adaptiveTuning } from '#lib/domain/skill-progression/adaptiveTuning.ts'
import { validateAdaptiveTuning } from '#lib/domain/skill-progression/adaptiveTuningValidation.ts'

describe('adaptiveTuning validation', () => {
	it('accepts the canonical tuning object without throwing', () => {
		expect(() => {
			validateAdaptiveTuning(adaptiveTuning)
		}).not.toThrow()
	})

	it('rejects a tuning object with a non-zero minimum skill', () => {
		const invalidTuning = structuredClone(adaptiveTuning)
		invalidTuning.skillBounds.minSkill = 1

		expect(() => {
			validateAdaptiveTuning(invalidTuning)
		}).toThrow('minSkill must remain 0')
	})

	it('rejects a tuning object with a maximum skill other than 100', () => {
		const invalidTuning = structuredClone(adaptiveTuning)
		invalidTuning.skillBounds.maxSkill = 120

		expect(() => {
			validateAdaptiveTuning(invalidTuning)
		}).toThrow('maxSkill must remain 100')
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
