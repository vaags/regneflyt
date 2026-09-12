import { describe, expect, it } from 'vitest'
import { getOperatorWeights } from '#lib/domain/puzzle-generation/operatorSelection.ts'
import type { OperatorSkillMap } from '#lib/domain/skill-progression/skillModel.ts'

describe('getOperatorWeights', () => {
	it('returns equal weights for equal skills', () => {
		const skills: OperatorSkillMap = [25, 25, 25, 25]
		const weights = getOperatorWeights(skills)
		expect(weights).toHaveLength(4)
		for (const w of weights) {
			expect(w).toBeCloseTo(0.25, 2)
		}
	})

	it('favors lower-skill operators', () => {
		const skills: OperatorSkillMap = [80, 10, 10, 10]
		const weights = getOperatorWeights(skills)
		// Addition (high skill) should have lowest weight
		expect(weights[0]).toBeLessThan(weights[1])
		expect(weights[0]).toBeLessThan(weights[2])
		expect(weights[0]).toBeLessThan(weights[3])
	})

	it('probabilities sum to 1', () => {
		const skills: OperatorSkillMap = [50, 20, 70, 10]
		const weights = getOperatorWeights(skills)
		const sum = weights.reduce((a, b) => a + b, 0)
		expect(sum).toBeCloseTo(1, 10)
	})
})
