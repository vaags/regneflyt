import { describe, expect, it } from 'vitest'
import { Operator } from '#lib/domain/arithmetic/operator.ts'
import {
	createRng,
	nextFloat,
	nextInt
} from '#lib/domain/puzzle-generation/random.ts'
import { resolveOperatorPuzzleSettings } from '#lib/domain/puzzle-generation/skillBasedPuzzleSettings.ts'
import { adaptiveTuning } from '#lib/domain/skill-progression/adaptiveTuning.ts'
import {
	adaptiveDifficultyId,
	customDifficultyId
} from '#lib/domain/skill-progression/difficultyMode.ts'

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

describe('skillBasedPuzzleSettings', () => {
	it('keeps custom adaptive addition/subtraction within configured bounds', () => {
		const lowSkill = resolveOperatorPuzzleSettings(
			Operator.Addition,
			0,
			customDifficultyId,
			[10, 20],
			[]
		)
		const highSkill = resolveOperatorPuzzleSettings(
			Operator.Addition,
			100,
			customDifficultyId,
			[10, 20],
			[]
		)

		// In custom mode, skill does not affect the range — user's chosen range is used as-is
		expect(lowSkill.range).toEqual([10, 20])
		expect(highSkill.range).toEqual([10, 20])
	})

	it('applies algebraic skill offset only in adaptive algebraic forms', () => {
		const normal = resolveOperatorPuzzleSettings(
			Operator.Addition,
			70,
			adaptiveDifficultyId,
			[1, 20],
			[],
			0,
			false
		)
		const algebraic = resolveOperatorPuzzleSettings(
			Operator.Addition,
			70,
			adaptiveDifficultyId,
			[1, 20],
			[],
			0,
			true
		)
		const customAlgebraic = resolveOperatorPuzzleSettings(
			Operator.Addition,
			70,
			customDifficultyId,
			[1, 20],
			[],
			0,
			true
		)

		expect(algebraic.effectiveSkill).toBe(
			70 - adaptiveTuning.algebraicRollout.algebraicSkillOffset
		)
		expect(normal.effectiveSkill).toBe(70)
		expect(customAlgebraic.effectiveSkill).toBe(70)
	})

	it('applies algebraic skill offset to multiplication and division', () => {
		const mulNormal = resolveOperatorPuzzleSettings(
			Operator.Multiplication,
			70,
			adaptiveDifficultyId,
			[1, 10],
			[2, 3, 4, 5],
			0,
			false
		)
		const mulAlgebraic = resolveOperatorPuzzleSettings(
			Operator.Multiplication,
			70,
			adaptiveDifficultyId,
			[1, 10],
			[2, 3, 4, 5],
			0,
			true
		)
		const divAlgebraic = resolveOperatorPuzzleSettings(
			Operator.Division,
			70,
			adaptiveDifficultyId,
			[1, 10],
			[2, 3, 4, 5],
			0,
			true
		)
		const mulCustomAlgebraic = resolveOperatorPuzzleSettings(
			Operator.Multiplication,
			70,
			customDifficultyId,
			[1, 10],
			[2, 3, 4, 5],
			0,
			true
		)

		expect(mulAlgebraic.effectiveSkill).toBe(
			70 - adaptiveTuning.algebraicRollout.algebraicSkillOffset
		)
		expect(divAlgebraic.effectiveSkill).toBe(
			70 - adaptiveTuning.algebraicRollout.algebraicSkillOffset
		)
		expect(mulNormal.effectiveSkill).toBe(70)
		// Custom mode ignores the algebraic offset
		expect(mulCustomAlgebraic.effectiveSkill).toBe(70)
	})

	it('clamps effective skill to 0 when algebraic offset exceeds skill', () => {
		const lowSkillAlgebraic = resolveOperatorPuzzleSettings(
			Operator.Addition,
			5,
			adaptiveDifficultyId,
			[1, 20],
			[],
			0,
			true
		)
		const mulLowSkillAlgebraic = resolveOperatorPuzzleSettings(
			Operator.Multiplication,
			5,
			adaptiveDifficultyId,
			[1, 10],
			[2, 3, 4, 5],
			0,
			true
		)

		expect(lowSkillAlgebraic.effectiveSkill).toBe(0)
		expect(mulLowSkillAlgebraic.effectiveSkill).toBe(0)
	})

	it('expands adaptive ranges and table sets as skill increases', () => {
		const lowAddition = resolveOperatorPuzzleSettings(
			Operator.Addition,
			0,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)
		const midAddition = resolveOperatorPuzzleSettings(
			Operator.Addition,
			50,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)
		const highAddition = resolveOperatorPuzzleSettings(
			Operator.Addition,
			100,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)

		// Low skill: range starts at the configured minimum upper bound
		expect(lowAddition.range[0]).toBe(1)
		expect(lowAddition.range[1]).toBe(
			adaptiveTuning.additionSubtraction.rangeBase
		)

		// Mid skill: range is between low and high
		expect(midAddition.range[0]).toBeGreaterThan(lowAddition.range[0])
		expect(midAddition.range[1]).toBeGreaterThan(lowAddition.range[1])
		expect(midAddition.range[1]).toBeLessThan(highAddition.range[1])

		// High skill: upper bound reaches the full scale
		expect(highAddition.range[1]).toBe(
			adaptiveTuning.additionSubtraction.rangeBase +
				adaptiveTuning.additionSubtraction.rangeScale
		)

		// Monotonicity: ranges grow with skill
		for (let skill = 0; skill < 100; skill += 10) {
			const current = resolveOperatorPuzzleSettings(
				Operator.Addition,
				skill,
				adaptiveDifficultyId,
				[1, 20],
				[]
			)
			const next = resolveOperatorPuzzleSettings(
				Operator.Addition,
				skill + 10,
				adaptiveDifficultyId,
				[1, 20],
				[]
			)
			expect(next.range[1]).toBeGreaterThanOrEqual(current.range[1])
		}

		// Multiplication: low skill gets few tables, high skill gets many
		const lowMultiplication = resolveOperatorPuzzleSettings(
			Operator.Multiplication,
			0,
			adaptiveDifficultyId,
			[0, 0],
			[2, 3, 4]
		)
		const highMultiplication = resolveOperatorPuzzleSettings(
			Operator.Multiplication,
			100,
			adaptiveDifficultyId,
			[0, 0],
			[2, 3, 4]
		)

		// Low skill: only the easiest tables
		expect(lowMultiplication.possibleValues.length).toBeGreaterThanOrEqual(1)
		expect(lowMultiplication.possibleValues.length).toBeLessThan(
			highMultiplication.possibleValues.length
		)

		// Range first value starts at mulDivFactorMin
		expect(lowMultiplication.range[0]).toBe(
			adaptiveTuning.multiplicationDivision.factorMin
		)
		// At low skill, max factor is capped below the full range
		expect(lowMultiplication.range[1]).toBe(
			adaptiveTuning.multiplicationDivision.factorMaxAtMinSkill
		)

		// High skill: more tables unlocked, higher minimum factor
		expect(highMultiplication.possibleValues.length).toBeGreaterThan(
			lowMultiplication.possibleValues.length
		)
		expect(highMultiplication.range[0]).toBeGreaterThanOrEqual(
			adaptiveTuning.multiplicationDivision.factorMinAtMaxSkill
		)
	})

	it('keeps custom multiplication/division inside user-provided values', () => {
		const customLow = resolveOperatorPuzzleSettings(
			Operator.Multiplication,
			0,
			customDifficultyId,
			[0, 0],
			[3, 7, 9]
		)
		const customHigh = resolveOperatorPuzzleSettings(
			Operator.Multiplication,
			100,
			customDifficultyId,
			[0, 0],
			[3, 7, 9]
		)

		// In custom mode, skill does not affect tables or factor range
		expect(customLow.possibleValues).toEqual([3, 7, 9])
		expect(customLow.range).toEqual([1, 10])
		expect(customHigh.possibleValues).toEqual([3, 7, 9])
		expect(customHigh.range).toEqual([1, 10])
	})

	it('fuzz: resolveOperatorPuzzleSettings never returns degenerate ranges', () => {
		const { randomInt } = createFuzzHelpers(91_343)
		const addSubOps = [Operator.Addition, Operator.Subtraction]
		const mulDivOps = [Operator.Multiplication, Operator.Division]
		const difficulties = [adaptiveDifficultyId, customDifficultyId] as const

		for (let i = 0; i < FUZZ_ITERATIONS; i++) {
			const skill = randomInt(-10, 110)
			const difficulty = difficulties[randomInt(0, 1)]!

			// Addition / Subtraction
			const addOp = addSubOps[randomInt(0, 1)]!
			const rangeMin = randomInt(1, 50)
			const rangeMax = randomInt(rangeMin + 2, rangeMin + 100)
			const addResult = resolveOperatorPuzzleSettings(
				addOp,
				skill,
				difficulty,
				[rangeMin, rangeMax],
				[]
			)

			expect(addResult.range[0]).toBeLessThan(addResult.range[1])
			expect(Number.isFinite(addResult.range[0])).toBe(true)
			expect(Number.isFinite(addResult.range[1])).toBe(true)

			// Secondary range (lagging operand) must also be valid
			if (addResult.secondaryRange) {
				expect(addResult.secondaryRange[0]).toBeLessThan(
					addResult.secondaryRange[1]
				)
				expect(addResult.secondaryRange[1]).toBeLessThanOrEqual(
					addResult.range[1]
				)
			}

			// Multiplication / Division
			const mulOp = mulDivOps[randomInt(0, 1)]!
			const tables = Array.from({ length: randomInt(1, 8) }, () =>
				randomInt(1, 14)
			)
			const mulResult = resolveOperatorPuzzleSettings(
				mulOp,
				skill,
				difficulty,
				[0, 0],
				tables
			)

			expect(mulResult.range[0]).toBeLessThanOrEqual(mulResult.range[1])
			expect(mulResult.possibleValues.length).toBeGreaterThan(0)
		}
	})

	it('uses separate exponents for addition and subtraction ranges', () => {
		const addSettings = resolveOperatorPuzzleSettings(
			Operator.Addition,
			50,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)
		const subSettings = resolveOperatorPuzzleSettings(
			Operator.Subtraction,
			50,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)

		// Matching exponents produce equal range growth for add/sub.
		expect(subSettings.range[1]).toBeLessThanOrEqual(addSettings.range[1])
	})

	it('reduces range during incorrect cooldown', () => {
		const normalSettings = resolveOperatorPuzzleSettings(
			Operator.Addition,
			50,
			adaptiveDifficultyId,
			[1, 20],
			[],
			0
		)
		const cooldownSettings = resolveOperatorPuzzleSettings(
			Operator.Addition,
			50,
			adaptiveDifficultyId,
			[1, 20],
			[],
			1
		)

		// Cooldown narrows the upper bound
		expect(cooldownSettings.range[1]).toBeLessThan(normalSettings.range[1])
		// Lower bound unchanged
		expect(cooldownSettings.range[0]).toBe(normalSettings.range[0])

		// Cooldown also narrows the secondary range
		expect(cooldownSettings.secondaryRange![1]).toBeLessThan(
			normalSettings.secondaryRange![1]
		)
	})

	it('staggers operand ranges so second operand trails the first', () => {
		// At skill 30, primary range should include double digits
		// but secondary (lagged) range should still be mostly single digits
		const settings = resolveOperatorPuzzleSettings(
			Operator.Addition,
			30,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)

		expect(settings.secondaryRange).toBeDefined()
		// Primary range should reach into double digits
		expect(settings.range[1]).toBeGreaterThan(10)
		// Secondary range should be smaller (lagging behind)
		expect(settings.secondaryRange![1]).toBeLessThan(settings.range[1])
		// Secondary uses effective skill = 30 - lag. Assert it matches that lagged skill's range.
		const laggedSettings = resolveOperatorPuzzleSettings(
			Operator.Addition,
			30 - adaptiveTuning.additionSubtraction.secondOperandSkillLag,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)
		expect(settings.secondaryRange![1]).toBe(laggedSettings.range[1])
	})

	it('starts lagged addition operand growth by mid-teens skill', () => {
		const atLag = resolveOperatorPuzzleSettings(
			Operator.Addition,
			adaptiveTuning.additionSubtraction.secondOperandSkillLag,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)
		const justAboveLag = resolveOperatorPuzzleSettings(
			Operator.Addition,
			adaptiveTuning.additionSubtraction.secondOperandSkillLag + 8,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)

		expect(atLag.secondaryRange![1]).toBe(
			adaptiveTuning.additionSubtraction.rangeBase
		)
		expect(justAboveLag.secondaryRange![1]).toBeGreaterThan(
			atLag.secondaryRange![1]
		)
	})

	it('starts lagged subtraction operand growth by low twenties skill', () => {
		const atLag = resolveOperatorPuzzleSettings(
			Operator.Subtraction,
			adaptiveTuning.additionSubtraction.secondOperandSkillLag,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)
		const justAboveLag = resolveOperatorPuzzleSettings(
			Operator.Subtraction,
			adaptiveTuning.additionSubtraction.secondOperandSkillLag + 10,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)

		expect(atLag.secondaryRange![1]).toBe(
			adaptiveTuning.additionSubtraction.rangeBase
		)
		expect(justAboveLag.secondaryRange![1]).toBeGreaterThan(
			atLag.secondaryRange![1]
		)
	})

	it('secondary range converges with primary at high skill', () => {
		// At high skill, the lag becomes negligible relative to the range size
		const settings = resolveOperatorPuzzleSettings(
			Operator.Addition,
			100,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)

		// Both should be large and relatively close together
		expect(settings.range[1]).toBe(
			adaptiveTuning.additionSubtraction.rangeBase +
				adaptiveTuning.additionSubtraction.rangeScale
		)
		expect(settings.secondaryRange![1]).toBeGreaterThan(70)
	})

	it('secondary range is absent in custom mode', () => {
		const settings = resolveOperatorPuzzleSettings(
			Operator.Addition,
			50,
			customDifficultyId,
			[10, 20],
			[]
		)

		expect(settings.secondaryRange).toBeUndefined()
	})
})
