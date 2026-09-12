import { describe, expect, it } from 'vitest'
import { adaptiveTuning } from '#lib/domain/skill-progression/adaptiveTuning.ts'

describe('adaptiveTuning canonical policy', () => {
	it('pins puzzle-mode rollout policy in one focused place', () => {
		expect(adaptiveTuning.puzzleMode).toEqual({
			alternateMidpoint: 40,
			randomMidpoint: 68,
			transitionSpread: 14
		})
	})
})
