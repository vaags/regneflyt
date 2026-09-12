import { describe, expect, it } from 'vitest'
import { Operator } from '#lib/domain/arithmetic/operator.ts'
import type { PuzzlePartSet } from '#lib/domain/puzzle-generation/puzzle.ts'
import {
	countCarriesOrBorrows,
	getDifficultyRatio,
	getPuzzleDifficulty
} from '#lib/domain/puzzle-generation/puzzleDifficulty.ts'
import {
	createRng,
	nextFloat,
	nextInt
} from '#lib/domain/puzzle-generation/random.ts'

function makeParts(a: number, b: number, result: number): PuzzlePartSet {
	return [
		{ generatedValue: a, userDefinedValue: undefined },
		{ generatedValue: b, userDefinedValue: undefined },
		{ generatedValue: result, userDefinedValue: undefined }
	] as PuzzlePartSet
}

describe('puzzleDifficulty', () => {
	it('scores larger no-carry addition as harder than smaller no-carry addition', () => {
		const small = getPuzzleDifficulty(Operator.Addition, makeParts(1, 2, 3))
		const medium = getPuzzleDifficulty(Operator.Addition, makeParts(42, 35, 77))
		const large = getPuzzleDifficulty(
			Operator.Addition,
			makeParts(333, 444, 777)
		)

		expect(small).toBeLessThanOrEqual(9)
		expect(medium).toBeGreaterThan(30)
		expect(medium).toBeLessThan(70)
		expect(large).toBeGreaterThan(80)
		expect(medium).toBeGreaterThan(small)
		expect(large).toBeGreaterThan(small)
		expect(large).toBeGreaterThan(medium)
	})

	it('scores addition with carry as harder than larger no-carry addition', () => {
		const noCarry = getPuzzleDifficulty(Operator.Addition, makeParts(20, 9, 29))
		const withCarry = getPuzzleDifficulty(
			Operator.Addition,
			makeParts(16, 6, 22)
		)

		expect(withCarry).toBeGreaterThan(noCarry)
	})

	it('scores subtraction with borrow as harder than no-borrow subtraction', () => {
		const noBorrow = getPuzzleDifficulty(
			Operator.Subtraction,
			makeParts(52, 31, 21)
		)
		const withBorrow = getPuzzleDifficulty(
			Operator.Subtraction,
			makeParts(52, 38, 14)
		)

		expect(withBorrow).toBeGreaterThan(noBorrow)
	})

	it('scores subtraction difficulty by operand magnitude', () => {
		const easy = getPuzzleDifficulty(Operator.Subtraction, makeParts(3, 1, 2))
		const medium = getPuzzleDifficulty(
			Operator.Subtraction,
			makeParts(52, 31, 21)
		)
		const hard = getPuzzleDifficulty(
			Operator.Subtraction,
			makeParts(100, 95, 5)
		)

		expect(medium).toBeGreaterThan(30)
		expect(medium).toBeLessThan(85)
		expect(hard).toBeGreaterThan(80)
		expect(easy).toBeLessThan(medium)
		expect(medium).toBeLessThan(hard)
	})

	it('scores identity-table multiplication easier than non-identity table', () => {
		const identity = getPuzzleDifficulty(
			Operator.Multiplication,
			makeParts(1, 10, 10)
		)
		const nonIdentity = getPuzzleDifficulty(
			Operator.Multiplication,
			makeParts(9, 10, 90)
		)

		expect(identity).toBeLessThan(nonIdentity)
	})

	it('saturates the hardest configured multiplication pattern', () => {
		expect(
			getPuzzleDifficulty(Operator.Multiplication, makeParts(14, 9, 126))
		).toBe(100)
	})

	it('scores harder division patterns higher than easy identity division', () => {
		const easy = getPuzzleDifficulty(Operator.Division, makeParts(10, 1, 10))
		const hard = getPuzzleDifficulty(Operator.Division, makeParts(72, 8, 9))

		expect(hard).toBeGreaterThan(easy)
	})

	it('counts carries and borrows correctly for known cases', () => {
		expect(countCarriesOrBorrows(58, 67, false)).toBe(2)
		expect(countCarriesOrBorrows(42, 19, true)).toBe(1)
		expect(countCarriesOrBorrows(100, 19, true)).toBe(2)
	})

	it('computes difficulty ratio with a zero-safe offset and clamps at one', () => {
		expect(getDifficultyRatio(50, 50)).toBe(1)
		expect(getDifficultyRatio(25, 50)).toBeCloseTo(26 / 51, 2)
		expect(getDifficultyRatio(80, 40)).toBe(1)
		expect(getDifficultyRatio(0, 100)).toBeCloseTo(1 / 101, 2)
		expect(getDifficultyRatio(5, 0)).toBe(1)
		expect(getDifficultyRatio(0, 0)).toBe(1)
		expect(getDifficultyRatio(-10, 100)).toBe(0)
	})

	it('returns bounded scores for deterministic extreme puzzles', () => {
		const puzzles: Array<[Operator, PuzzlePartSet]> = [
			[Operator.Addition, makeParts(1, 1, 2)],
			[Operator.Addition, makeParts(999, 1, 1000)],
			[Operator.Subtraction, makeParts(1000, 999, 1)],
			[Operator.Subtraction, makeParts(999, 1, 998)],
			[Operator.Multiplication, makeParts(1, 1, 1)],
			[Operator.Multiplication, makeParts(12, 10, 120)],
			[Operator.Division, makeParts(10, 1, 10)],
			[Operator.Division, makeParts(120, 12, 10)]
		]

		for (const [operator, parts] of puzzles) {
			const score = getPuzzleDifficulty(operator, parts)
			expect(Number.isInteger(score)).toBe(true)
			expect(score).toBeGreaterThanOrEqual(0)
			expect(score).toBeLessThanOrEqual(100)
		}
	})
})

import { resolveOperatorPuzzleSettings } from '#lib/domain/puzzle-generation/skillBasedPuzzleSettings.ts'
import { adaptiveDifficultyId } from '#lib/domain/skill-progression/difficultyMode.ts'
import { getUpdatedSkill } from '#lib/domain/skill-progression/skillUpdate.ts'

// Fixture builders for operator-specific puzzle parts.
function makeAddParts(a: number, b: number): PuzzlePartSet {
	return [
		{ generatedValue: a, userDefinedValue: undefined },
		{ generatedValue: b, userDefinedValue: undefined },
		{ generatedValue: a + b, userDefinedValue: undefined }
	] as PuzzlePartSet
}

function makeSubParts(a: number, b: number): PuzzlePartSet {
	return [
		{ generatedValue: a, userDefinedValue: undefined },
		{ generatedValue: b, userDefinedValue: undefined },
		{ generatedValue: a - b, userDefinedValue: undefined }
	] as PuzzlePartSet
}

function makeMulParts(table: number, factor: number): PuzzlePartSet {
	return [
		{ generatedValue: table, userDefinedValue: undefined },
		{ generatedValue: factor, userDefinedValue: undefined },
		{ generatedValue: table * factor, userDefinedValue: undefined }
	] as PuzzlePartSet
}

function makeDivParts(table: number, factor: number): PuzzlePartSet {
	return [
		{ generatedValue: table * factor, userDefinedValue: undefined },
		{ generatedValue: table, userDefinedValue: undefined },
		{ generatedValue: factor, userDefinedValue: undefined }
	] as PuzzlePartSet
}

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

const sampleDifficultyMedian = (
	op: Operator,
	skill: number,
	samplesPerSkill: number
): number => {
	const settings = resolveOperatorPuzzleSettings(
		op,
		skill,
		adaptiveDifficultyId,
		[1, 200],
		[]
	)
	const { rng } = createRng(10_000 + op * 1_000 + skill * 10 + samplesPerSkill)

	const scores: number[] = []
	for (let i = 0; i < samplesPerSkill; i++) {
		if (op === Operator.Addition || op === Operator.Subtraction) {
			const [lo1, hi1] = settings.range
			const [lo2, hi2] = settings.secondaryRange ?? settings.range
			const a = nextInt(rng, lo1, hi1)
			const b = nextInt(rng, lo2, hi2)
			const [left, right] =
				op === Operator.Subtraction
					? [Math.max(a, b), Math.min(a, b)]
					: nextInt(rng, 0, 1) === 0
						? [a, b]
						: [b, a]
			const result = op === Operator.Subtraction ? left - right : left + right
			const parts = [
				{ generatedValue: left, userDefinedValue: undefined },
				{ generatedValue: right, userDefinedValue: undefined },
				{ generatedValue: result, userDefinedValue: undefined }
			] as PuzzlePartSet
			scores.push(getPuzzleDifficulty(op, parts))
			continue
		}

		const table =
			settings.possibleValues[
				nextInt(rng, 0, settings.possibleValues.length - 1)
			]!
		const factor = nextInt(rng, settings.range[0], settings.range[1])
		const parts =
			op === Operator.Multiplication
				? ([
						{ generatedValue: table, userDefinedValue: undefined },
						{ generatedValue: factor, userDefinedValue: undefined },
						{
							generatedValue: table * factor,
							userDefinedValue: undefined
						}
					] as PuzzlePartSet)
				: ([
						{
							generatedValue: table * factor,
							userDefinedValue: undefined
						},
						{ generatedValue: table, userDefinedValue: undefined },
						{ generatedValue: factor, userDefinedValue: undefined }
					] as PuzzlePartSet)
		scores.push(getPuzzleDifficulty(op, parts))
	}

	scores.sort((a, b) => a - b)
	return scores[Math.floor(scores.length / 2)]!
}

describe('puzzleDifficulty integration and invariants', () => {
	it('strips trailing zeros from round operands in no-carry puzzles', () => {
		// 20+8, 100+8, and 8+1 should score very similarly —
		// trailing zeros mean no column work, so 20+8 ≈ 2+8 ≈ 8+1.
		const round1 = getPuzzleDifficulty(Operator.Addition, makeAddParts(20, 8))
		const round2 = getPuzzleDifficulty(Operator.Addition, makeAddParts(100, 8))
		const singleDigit = getPuzzleDifficulty(
			Operator.Addition,
			makeAddParts(8, 1)
		)
		expect(Math.abs(round1 - singleDigit)).toBeLessThanOrEqual(3)
		expect(Math.abs(round2 - singleDigit)).toBeLessThanOrEqual(3)

		// Non-round no-carry puzzle (47+32) should score much higher
		const nonRound = getPuzzleDifficulty(
			Operator.Addition,
			makeAddParts(47, 32)
		)
		expect(nonRound).toBeGreaterThan(round1 * 2)

		// Carry puzzles should NOT be stripped (23+8 has carry 3+8=11)
		const carry = getPuzzleDifficulty(Operator.Addition, makeAddParts(23, 8))
		expect(carry).toBeGreaterThan(round1)
	})

	it('discounts shared trailing-zero place-value in carry/borrow cases', () => {
		// Place-value carry (90+10) should be easier than dense carry (59+47).
		const roundCarry = getPuzzleDifficulty(
			Operator.Addition,
			makeAddParts(90, 10)
		)
		const denseCarry = getPuzzleDifficulty(
			Operator.Addition,
			makeAddParts(59, 47)
		)
		expect(roundCarry).toBeLessThan(denseCarry)

		// Place-value borrow (120-40) should be easier than dense borrow (95-68).
		const roundBorrow = getPuzzleDifficulty(
			Operator.Subtraction,
			makeSubParts(120, 40)
		)
		const denseBorrow = getPuzzleDifficulty(
			Operator.Subtraction,
			makeSubParts(95, 68)
		)
		expect(roundBorrow).toBeLessThan(denseBorrow)
	})

	it('applies shortcut-factor discount in multiplication and division', () => {
		const multiplicationShortcut = getPuzzleDifficulty(
			Operator.Multiplication,
			makeMulParts(13, 10)
		)
		const multiplicationRote = getPuzzleDifficulty(
			Operator.Multiplication,
			makeMulParts(13, 9)
		)
		const divisionShortcut = getPuzzleDifficulty(
			Operator.Division,
			makeDivParts(12, 10)
		)
		const divisionRote = getPuzzleDifficulty(
			Operator.Division,
			makeDivParts(12, 9)
		)

		expect(multiplicationShortcut).toBeLessThan(multiplicationRote)
		expect(multiplicationShortcut).toBeGreaterThanOrEqual(25)
		expect(multiplicationShortcut).toBeLessThanOrEqual(35)
		expect(divisionShortcut).toBeLessThan(divisionRote)

		const multiplicationIdentityShortcut = getPuzzleDifficulty(
			Operator.Multiplication,
			makeMulParts(12, 1)
		)
		const multiplicationIdentityReference = getPuzzleDifficulty(
			Operator.Multiplication,
			makeMulParts(12, 2)
		)
		const divisionIdentityShortcut = getPuzzleDifficulty(
			Operator.Division,
			makeDivParts(12, 1)
		)
		const divisionIdentityReference = getPuzzleDifficulty(
			Operator.Division,
			makeDivParts(12, 2)
		)

		expect(multiplicationIdentityShortcut).toBeLessThan(
			multiplicationIdentityReference
		)
		expect(multiplicationIdentityShortcut).toBeLessThanOrEqual(40)
		expect(divisionIdentityShortcut).toBeLessThan(divisionIdentityReference)
	})

	it('reduces factor influence when the active table is identity', () => {
		const identityHighFactor = getPuzzleDifficulty(
			Operator.Multiplication,
			makeMulParts(1, 9)
		)
		const identityLowFactor = getPuzzleDifficulty(
			Operator.Multiplication,
			makeMulParts(1, 2)
		)
		const hardTableHighFactor = getPuzzleDifficulty(
			Operator.Multiplication,
			makeMulParts(12, 9)
		)
		const hardTableLowFactor = getPuzzleDifficulty(
			Operator.Multiplication,
			makeMulParts(12, 2)
		)
		const hardAnchor = getPuzzleDifficulty(
			Operator.Multiplication,
			makeMulParts(12, 9)
		)

		expect(identityHighFactor).toBeLessThanOrEqual(35)
		expect(identityHighFactor - identityLowFactor).toBeLessThan(
			hardTableHighFactor - hardTableLowFactor
		)
		expect(hardAnchor).toBeGreaterThan(60)

		const divisionByOne = getPuzzleDifficulty(
			Operator.Division,
			makeDivParts(1, 9)
		)
		const divisionByHardTable = getPuzzleDifficulty(
			Operator.Division,
			makeDivParts(12, 9)
		)

		expect(divisionByOne).toBeLessThanOrEqual(35)
		expect(divisionByOne).toBeLessThan(divisionByHardTable)
	})

	it('allows subtraction to reach 100% skill with fast correct answers', () => {
		// Regression: subtraction could never pass 99% because the difficulty
		// formula used the addition scale (195), making the hardest subtraction
		// puzzles score only ~61/100, so the difficultyRatio at skill 99 was
		// too low for the gain to round above 0.
		const hardSubParts: PuzzlePartSet = [
			{ generatedValue: 100, userDefinedValue: undefined },
			{ generatedValue: 95, userDefinedValue: undefined },
			{ generatedValue: 5, userDefinedValue: undefined }
		] as PuzzlePartSet

		const difficulty = getPuzzleDifficulty(Operator.Subtraction, hardSubParts)
		const ratio = getDifficultyRatio(difficulty, 99)
		const gain = getUpdatedSkill(99, true, 1, ratio) - 99

		expect(difficulty).toBeGreaterThan(80)
		expect(gain).toBeGreaterThan(0)
	})

	it('difficulty scores track skill level for addition and subtraction', () => {
		const SAMPLES_PER_SKILL = 200
		const MAX_GAP = 15
		const skillLevels = [20, 40, 60, 80, 90, 95, 100]

		for (const op of [Operator.Addition, Operator.Subtraction]) {
			const label = op === Operator.Addition ? 'addition' : 'subtraction'
			for (const skill of skillLevels) {
				const median = sampleDifficultyMedian(op, skill, SAMPLES_PER_SKILL)
				const gap = Math.abs(median - skill)
				expect(
					gap,
					`${label} at skill ${skill}: median difficulty ${median} ` +
						`deviates by ${gap} (max ${MAX_GAP}). ` +
						`Recalibrate ${label === 'addition' ? 'addDifficultyScale' : 'subDifficultyScale'}.`
				).toBeLessThanOrEqual(MAX_GAP)
			}
		}
	})

	it('difficulty scores track skill level for multiplication and division', () => {
		const SAMPLES_PER_SKILL = 400
		const MAX_GAP = 20
		const MAX_GAP_CEILING = 25
		const observations: string[] = []
		const failures: string[] = []
		const skillLevels = [20, 40, 60, 80, 90, 95, 100]

		for (const op of [Operator.Multiplication, Operator.Division]) {
			const label =
				op === Operator.Multiplication ? 'multiplication' : 'division'
			for (const skill of skillLevels) {
				const median = sampleDifficultyMedian(op, skill, SAMPLES_PER_SKILL)
				const gap = Math.abs(median - skill)
				const effectiveMaxGap = skill >= 90 ? MAX_GAP_CEILING : MAX_GAP
				observations.push(`${label}@${skill}=median${median},gap${gap}`)
				if (gap > effectiveMaxGap) {
					failures.push(
						`${label} at skill ${skill}: median difficulty ${median} ` +
							`deviates by ${gap} (max ${effectiveMaxGap})`
					)
				}
			}
		}

		expect(failures, `Observed medians: ${observations.join('; ')}`).toEqual([])
	})

	it('difficulty standards stay broadly consistent across operators', () => {
		const SAMPLES_PER_SKILL = 300
		const MAX_SPREAD = 25
		const MAX_SPREAD_CEILING = 35
		const skillLevels = [20, 40, 60, 80, 90, 95, 100]
		const operators = [
			Operator.Addition,
			Operator.Subtraction,
			Operator.Multiplication,
			Operator.Division
		] as const

		for (const skill of skillLevels) {
			const medians = operators.map((op) =>
				sampleDifficultyMedian(op, skill, SAMPLES_PER_SKILL)
			)
			const spread = Math.max(...medians) - Math.min(...medians)
			const effectiveMaxSpread = skill >= 90 ? MAX_SPREAD_CEILING : MAX_SPREAD
			expect(
				spread,
				`skill ${skill}: operator medians ${medians.join(', ')} ` +
					`spread by ${spread} (max ${effectiveMaxSpread})`
			).toBeLessThanOrEqual(effectiveMaxSpread)
		}
	})

	it('fuzz: getDifficultyRatio always returns a value in [0, 1]', () => {
		const { randomInt } = createFuzzHelpers(91_340)
		for (let i = 0; i < FUZZ_ITERATIONS; i++) {
			const difficulty = randomInt(-20, 120)
			const skill = randomInt(-20, 120)

			const result = getDifficultyRatio(difficulty, skill)

			expect(Number.isFinite(result)).toBe(true)
			expect(result).toBeGreaterThanOrEqual(0)
			expect(result).toBeLessThanOrEqual(1)
		}
	})

	it('fuzz: getPuzzleDifficulty always returns an integer in [0, 100]', () => {
		const { randomInt } = createFuzzHelpers(91_341)
		const operators = [
			Operator.Addition,
			Operator.Subtraction,
			Operator.Multiplication,
			Operator.Division
		]

		for (let i = 0; i < FUZZ_ITERATIONS; i++) {
			const op = operators[randomInt(0, 3)]!
			const a = randomInt(0, 300)
			const b = randomInt(0, 300)
			const c =
				op === Operator.Addition
					? a + b
					: op === Operator.Subtraction
						? a - b
						: op === Operator.Multiplication
							? a * b
							: b !== 0
								? Math.floor(a / b)
								: 0

			const parts = [
				{ generatedValue: a, userDefinedValue: undefined },
				{ generatedValue: b, userDefinedValue: undefined },
				{ generatedValue: c, userDefinedValue: undefined }
			] as PuzzlePartSet

			const result = getPuzzleDifficulty(op, parts)

			expect(Number.isFinite(result)).toBe(true)
			expect(Number.isInteger(result)).toBe(true)
			expect(result).toBeGreaterThanOrEqual(0)
			expect(result).toBeLessThanOrEqual(100)
		}
	})

	it('scores subtraction higher than addition for equal operands', () => {
		// Same operand magnitude — subtraction should score higher difficulty
		// even with equal exponents, because subtraction uses a stricter
		// normalization scale and borrow-focused shaping.
		const addDifficulty = getPuzzleDifficulty(
			Operator.Addition,
			makeAddParts(40, 35)
		)
		const subDifficulty = getPuzzleDifficulty(
			Operator.Subtraction,
			makeSubParts(40, 35)
		)

		expect(subDifficulty).toBeGreaterThan(addDifficulty)
	})
})
