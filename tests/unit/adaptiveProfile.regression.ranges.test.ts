import { describe, expect, it } from 'vitest'
import { Operator } from '$lib/constants/Operator'
import {
	adaptiveDifficultyId,
	adaptiveTuning,
	customDifficultyId
} from '$lib/models/AdaptiveProfile'
import { getAdaptiveSettingsForOperator } from '$lib/helpers/adaptiveHelper'

/**
 * Golden regression tests for adaptive range/table outputs at specific skill levels.
 * These snapshot exact values to catch any drift during structural refactors.
 */
describe('adaptiveProfile golden regressions: ranges', () => {
	const skills = [0, 25, 50, 75, 100] as const

	describe('addition ranges', () => {
		const results = skills.map((skill) =>
			getAdaptiveSettingsForOperator(
				Operator.Addition,
				skill,
				adaptiveDifficultyId,
				[1, 100],
				[]
			)
		)

		it('golden addition range at skill 0', () => {
			expect(results[0]!.range).toMatchInlineSnapshot(`
				[
				  1,
				  5,
				]
			`)
			expect(results[0]!.secondaryRange).toMatchInlineSnapshot(`
				[
				  1,
				  5,
				]
			`)
			expect(results[0]!.effectiveSkill).toBe(0)
		})

		it('golden addition range at skill 25', () => {
			expect(results[1]!.range).toMatchInlineSnapshot(`
				[
				  1,
				  12,
				]
			`)
			expect(results[1]!.secondaryRange).toMatchInlineSnapshot(`
				[
				  1,
				  8,
				]
			`)
		})

		it('golden addition range at skill 50', () => {
			expect(results[2]!.range).toMatchInlineSnapshot(`
				[
				  7,
				  30,
				]
			`)
			expect(results[2]!.secondaryRange).toMatchInlineSnapshot(`
				[
				  4,
				  22,
				]
			`)
		})

		it('golden addition range at skill 75', () => {
			expect(results[3]!.range).toMatchInlineSnapshot(`
				[
				  20,
				  60,
				]
			`)
			expect(results[3]!.secondaryRange).toMatchInlineSnapshot(`
				[
				  14,
				  47,
				]
			`)
		})

		it('golden addition range at skill 100', () => {
			expect(results[4]!.range).toMatchInlineSnapshot(`
				[
				  45,
				  100,
				]
			`)
			expect(results[4]!.secondaryRange).toMatchInlineSnapshot(`
				[
				  34,
				  83,
				]
			`)
		})
	})

	describe('subtraction ranges', () => {
		const results = skills.map((skill) =>
			getAdaptiveSettingsForOperator(
				Operator.Subtraction,
				skill,
				adaptiveDifficultyId,
				[1, 100],
				[]
			)
		)

		it('golden subtraction range at skill 0', () => {
			expect(results[0]!.range).toMatchInlineSnapshot(`
				[
				  1,
				  5,
				]
			`)
			expect(results[0]!.secondaryRange).toMatchInlineSnapshot(`
				[
				  1,
				  5,
				]
			`)
		})

		it('golden subtraction range at skill 25', () => {
			expect(results[1]!.range).toMatchInlineSnapshot(`
				[
				  1,
				  12,
				]
			`)
			expect(results[1]!.secondaryRange).toMatchInlineSnapshot(`
				[
				  1,
				  8,
				]
			`)
		})

		it('golden subtraction range at skill 50', () => {
			expect(results[2]!.range).toMatchInlineSnapshot(`
				[
				  7,
				  30,
				]
			`)
			expect(results[2]!.secondaryRange).toMatchInlineSnapshot(`
				[
				  4,
				  22,
				]
			`)
		})

		it('golden subtraction range at skill 75', () => {
			expect(results[3]!.range).toMatchInlineSnapshot(`
				[
				  20,
				  60,
				]
			`)
			expect(results[3]!.secondaryRange).toMatchInlineSnapshot(`
				[
				  14,
				  47,
				]
			`)
		})

		it('golden subtraction range at skill 100', () => {
			expect(results[4]!.range).toMatchInlineSnapshot(`
				[
				  45,
				  100,
				]
			`)
			expect(results[4]!.secondaryRange).toMatchInlineSnapshot(`
				[
				  34,
				  83,
				]
			`)
		})
	})

	describe('multiplication tables', () => {
		const results = skills.map((skill) =>
			getAdaptiveSettingsForOperator(
				Operator.Multiplication,
				skill,
				adaptiveDifficultyId,
				[1, 10],
				[]
			)
		)

		it('golden multiplication tables at skill 0', () => {
			expect(results[0]!.possibleValues).toMatchInlineSnapshot(`
				[
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				]
			`)
			expect(results[0]!.range).toMatchInlineSnapshot(`
				[
				  1,
				  6,
				]
			`)
		})

		it('golden multiplication tables at skill 25', () => {
			expect(results[1]!.possibleValues).toMatchSnapshot()
			expect(results[1]!.range).toMatchInlineSnapshot(`
				[
				  3,
				  7,
				]
			`)
		})

		it('golden multiplication tables at skill 50', () => {
			expect(results[2]!.possibleValues).toMatchSnapshot()
			expect(results[2]!.range).toMatchInlineSnapshot(`
				[
				  4,
				  8,
				]
			`)
		})

		it('golden multiplication tables at skill 75', () => {
			expect(results[3]!.possibleValues).toMatchSnapshot()
			expect(results[3]!.range).toMatchInlineSnapshot(`
				[
				  6,
				  9,
				]
			`)
		})

		it('golden multiplication tables at skill 100', () => {
			expect(results[4]!.possibleValues).toMatchSnapshot()
			expect(results[4]!.range).toMatchInlineSnapshot(`
				[
				  7,
				  10,
				]
			`)
		})
	})

	describe('division tables', () => {
		const results = skills.map((skill) =>
			getAdaptiveSettingsForOperator(
				Operator.Division,
				skill,
				adaptiveDifficultyId,
				[1, 10],
				[]
			)
		)

		it('golden division tables at skill 0', () => {
			expect(results[0]!.possibleValues).toMatchInlineSnapshot(`
				[
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  1,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				  10,
				]
			`)
			expect(results[0]!.range).toMatchInlineSnapshot(`
				[
				  1,
				  6,
				]
			`)
		})

		it('golden division tables at skill 50', () => {
			expect(results[2]!.range).toMatchInlineSnapshot(`
				[
				  4,
				  8,
				]
			`)
			expect(results[2]!.possibleValues).toMatchSnapshot()
		})

		it('golden division tables at skill 100', () => {
			expect(results[4]!.range).toMatchInlineSnapshot(`
				[
				  7,
				  10,
				]
			`)
			expect(results[4]!.possibleValues).toMatchSnapshot()
		})
	})

	describe('algebraic form offset', () => {
		it('reduces effective skill by algebraicSkillOffset for addition', () => {
			const normal = getAdaptiveSettingsForOperator(
				Operator.Addition,
				50,
				adaptiveDifficultyId,
				[1, 100],
				[],
				0,
				false
			)
			const algebraic = getAdaptiveSettingsForOperator(
				Operator.Addition,
				50,
				adaptiveDifficultyId,
				[1, 100],
				[],
				0,
				true
			)

			expect(algebraic.effectiveSkill).toBe(35)
			expect(algebraic.range[1]).toBeLessThan(normal.range[1])
		})

		it('reduces effective skill by algebraicSkillOffset for multiplication', () => {
			const normal = getAdaptiveSettingsForOperator(
				Operator.Multiplication,
				60,
				adaptiveDifficultyId,
				[1, 10],
				[],
				0,
				false
			)
			const algebraic = getAdaptiveSettingsForOperator(
				Operator.Multiplication,
				60,
				adaptiveDifficultyId,
				[1, 10],
				[],
				0,
				true
			)

			expect(algebraic.effectiveSkill).toBe(45)
			expect(algebraic.possibleValues.length).toBeLessThanOrEqual(
				normal.possibleValues.length
			)
		})
	})

	describe('cooldown range reduction', () => {
		it('narrows addition range during cooldown', () => {
			const normal = getAdaptiveSettingsForOperator(
				Operator.Addition,
				60,
				adaptiveDifficultyId,
				[1, 100],
				[],
				0,
				false
			)
			const cooled = getAdaptiveSettingsForOperator(
				Operator.Addition,
				60,
				adaptiveDifficultyId,
				[1, 100],
				[],
				2,
				false
			)

			expect(cooled.range[1]).toBeLessThan(normal.range[1])
			expect(normal.range).toMatchInlineSnapshot(`
				[
				  11,
				  41,
				]
			`)
			expect(cooled.range).toMatchInlineSnapshot(`
				[
				  11,
				  35,
				]
			`)
		})

		it('narrows subtraction range during cooldown', () => {
			const normal = getAdaptiveSettingsForOperator(
				Operator.Subtraction,
				60,
				adaptiveDifficultyId,
				[1, 100],
				[],
				0,
				false
			)
			const cooled = getAdaptiveSettingsForOperator(
				Operator.Subtraction,
				60,
				adaptiveDifficultyId,
				[1, 100],
				[],
				2,
				false
			)

			expect(cooled.range[1]).toBeLessThan(normal.range[1])
			expect(cooled.secondaryRange?.[1]).toBeLessThan(
				normal.secondaryRange?.[1] ?? Infinity
			)
		})
	})

	describe('custom mode passthrough', () => {
		it('passes through factor range and possible values for custom multiplication', () => {
			const result = getAdaptiveSettingsForOperator(
				Operator.Multiplication,
				50,
				customDifficultyId,
				[1, 10],
				[2, 3, 4, 5]
			)

			expect(result.range).toEqual([
				adaptiveTuning.multiplicationDivision.factorMin,
				adaptiveTuning.multiplicationDivision.factorMax
			])
			expect(result.possibleValues).toEqual([2, 3, 4, 5])
		})

		it('passes through factor range and possible values for custom division', () => {
			const result = getAdaptiveSettingsForOperator(
				Operator.Division,
				50,
				customDifficultyId,
				[1, 10],
				[6, 7, 8]
			)

			expect(result.range).toEqual([
				adaptiveTuning.multiplicationDivision.factorMin,
				adaptiveTuning.multiplicationDivision.factorMax
			])
			expect(result.possibleValues).toEqual([6, 7, 8])
		})

		it('returns empty possible values for custom addition', () => {
			const result = getAdaptiveSettingsForOperator(
				Operator.Addition,
				50,
				customDifficultyId,
				[10, 20],
				[]
			)

			expect(result.range).toEqual([10, 20])
			expect(result.possibleValues).toEqual([])
		})

		it('returns empty possible values for custom subtraction', () => {
			const result = getAdaptiveSettingsForOperator(
				Operator.Subtraction,
				50,
				customDifficultyId,
				[10, 20],
				[]
			)

			expect(result.range).toEqual([10, 20])
			expect(result.possibleValues).toEqual([])
		})
	})
})
