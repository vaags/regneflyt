import { describe, expect, it } from 'vitest'
import {
	defaultOperatorSkillMap,
	mapOperatorTuple
} from '#lib/domain/skill-progression/skillModel.ts'
import { sanitizeOperatorSkillMap } from '#lib/domain/skill-progression/skillUpdate.ts'

describe('skillModel', () => {
	it('maps operator tuples with stable values and indexes', () => {
		expect(
			mapOperatorTuple([10, 20, 30, 40], (value, index) => value + index)
		).toEqual([10, 21, 32, 43])
	})

	it('sanitizes malformed skill maps to defaults', () => {
		expect(sanitizeOperatorSkillMap(undefined)).toEqual(defaultOperatorSkillMap)
		expect(sanitizeOperatorSkillMap([1, 2, 3])).toEqual(defaultOperatorSkillMap)
		expect(
			sanitizeOperatorSkillMap([1, 'x', Number.POSITIVE_INFINITY, -100])
		).toEqual([1, 0, 0, 0])
	})
})
