import { describe, expect, it } from 'vitest'
import { Operator, OperatorExtended } from '$lib/constants/Operator'
import {
	adaptiveDifficultyId,
	customDifficultyId,
	type AdaptiveSkillMap
} from '$lib/models/AdaptiveProfile'
import { resolveOperator } from '$lib/helpers/operatorResolution'
import { createRng } from '$lib/helpers/rng'

function createCountsMap(): Map<Operator, number> {
	return new Map<Operator, number>([
		[Operator.Addition, 0],
		[Operator.Subtraction, 0],
		[Operator.Multiplication, 0],
		[Operator.Division, 0]
	])
}

function incrementCount(
	counts: Map<Operator, number>,
	operator: Operator
): void {
	counts.set(operator, (counts.get(operator) ?? 0) + 1)
}

function expectCountWithinDeviation(
	count: number,
	expectedCount: number,
	maxDeviation: number
): void {
	expect(Math.abs(count - expectedCount)).toBeLessThanOrEqual(maxDeviation)
}

describe('operatorResolution', () => {
	it('returns selected operator directly when not All', () => {
		const skillMap: AdaptiveSkillMap = [10, 20, 30, 40]
		const { rng } = createRng(1)

		expect(
			resolveOperator(rng, Operator.Addition, adaptiveDifficultyId, skillMap)
		).toBe(Operator.Addition)
		expect(
			resolveOperator(rng, Operator.Subtraction, customDifficultyId, skillMap)
		).toBe(Operator.Subtraction)
		expect(
			resolveOperator(
				rng,
				Operator.Multiplication,
				customDifficultyId,
				skillMap
			)
		).toBe(Operator.Multiplication)
		expect(
			resolveOperator(rng, Operator.Division, adaptiveDifficultyId, skillMap)
		).toBe(Operator.Division)
	})

	it('throws when operator is undefined', () => {
		const { rng } = createRng(2)
		expect(() =>
			resolveOperator(rng, undefined, adaptiveDifficultyId, [0, 0, 0, 0])
		).toThrow('Cannot get operator: parameter is undefined')
	})

	it('samples all operators in non-adaptive All mode', () => {
		const skillMap: AdaptiveSkillMap = [50, 50, 50, 50]
		const counts = createCountsMap()
		const sampleCount = 2_000
		const expectedCount = sampleCount / 4
		const maxDeviation = 80

		for (let seed = 0; seed < sampleCount; seed++) {
			const { rng } = createRng(seed)
			const operator = resolveOperator(
				rng,
				OperatorExtended.All,
				customDifficultyId,
				skillMap
			)
			incrementCount(counts, operator)
		}

		for (const operator of [
			Operator.Addition,
			Operator.Subtraction,
			Operator.Multiplication,
			Operator.Division
		]) {
			const count = counts.get(operator) ?? 0
			expectCountWithinDeviation(count, expectedCount, maxDeviation)
		}
	})

	it('uses weighted adaptive All mode to favor weaker operators', () => {
		const counts = createCountsMap()
		const sampleCount = 4_000
		const adaptiveSkillByOperator: AdaptiveSkillMap = [100, 0, 0, 0]
		const { rng } = createRng(42_4242)

		for (let iteration = 0; iteration < sampleCount; iteration++) {
			const operator = resolveOperator(
				rng,
				OperatorExtended.All,
				adaptiveDifficultyId,
				adaptiveSkillByOperator
			)
			incrementCount(counts, operator)
		}

		const additionCount = counts.get(Operator.Addition) ?? 0
		const subtractionCount = counts.get(Operator.Subtraction) ?? 0
		const multiplicationCount = counts.get(Operator.Multiplication) ?? 0
		const divisionCount = counts.get(Operator.Division) ?? 0
		const weakAverage =
			(subtractionCount + multiplicationCount + divisionCount) / 3

		// Damped weights: strong operator gets ~9% instead of ~2.3%
		expect(additionCount).toBeLessThan(weakAverage * 0.45)
		expect(additionCount).toBeGreaterThan(sampleCount * 0.05)
		expect(subtractionCount).toBeGreaterThan(additionCount)
		expect(multiplicationCount).toBeGreaterThan(additionCount)
		expect(divisionCount).toBeGreaterThan(additionCount)
	})

	it('damped weights reduce starvation of strong operators', () => {
		const counts = createCountsMap()
		const sampleCount = 4_000
		const adaptiveSkillByOperator: AdaptiveSkillMap = [100, 0, 0, 0]
		const { rng } = createRng(42_4242)

		for (let iteration = 0; iteration < sampleCount; iteration++) {
			const operator = resolveOperator(
				rng,
				OperatorExtended.All,
				adaptiveDifficultyId,
				adaptiveSkillByOperator
			)
			incrementCount(counts, operator)
		}

		const additionCount = counts.get(Operator.Addition) ?? 0
		// With damped weights (0.7 factor), strong operator should appear >= 5%
		expect(additionCount / sampleCount).toBeGreaterThanOrEqual(0.05)
	})

	it('is near-uniform in adaptive All mode when skills are equal', () => {
		const counts = createCountsMap()
		const sampleCount = 4_000
		const expectedCount = sampleCount / 4
		const maxDeviation = 120
		const adaptiveSkillByOperator: AdaptiveSkillMap = [25, 25, 25, 25]
		const { rng } = createRng(42)

		for (let iteration = 0; iteration < sampleCount; iteration++) {
			const operator = resolveOperator(
				rng,
				OperatorExtended.All,
				adaptiveDifficultyId,
				adaptiveSkillByOperator
			)
			incrementCount(counts, operator)
		}

		for (const operator of [
			Operator.Addition,
			Operator.Subtraction,
			Operator.Multiplication,
			Operator.Division
		]) {
			const count = counts.get(operator) ?? 0
			expectCountWithinDeviation(count, expectedCount, maxDeviation)
		}
	})
})
