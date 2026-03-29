import { describe, expect, it } from 'vitest'
import {
	adaptiveDifficultyId,
	adaptiveTuning,
	customAdaptiveDifficultyId,
	defaultAdaptiveSkillMap
} from '$lib/models/AdaptiveProfile'
import {
	applySkillUpdate,
	getAdaptivePuzzleMode,
	getAdaptiveSettingsForOperator,
	getUpdatedSkill,
	getPuzzleDifficulty,
	getDifficultyRatio,
	normalizeDifficulty,
	sanitizeAdaptiveSkillMap
} from '$lib/helpers/adaptiveHelper'
import type { AdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
import { Operator } from '$lib/constants/Operator'
import { PuzzleMode } from '$lib/constants/PuzzleMode'
import type { PuzzlePartSet } from '$lib/models/Puzzle'
import { createRng, nextInt } from '$lib/helpers/rng'

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

describe('adaptiveProfile', () => {
	it('normalizes old difficulty values to adaptive/custom modes', () => {
		expect(normalizeDifficulty(0)).toBe(customAdaptiveDifficultyId)
		expect(normalizeDifficulty(1)).toBe(adaptiveDifficultyId)
		expect(normalizeDifficulty(6)).toBe(adaptiveDifficultyId)
		expect(normalizeDifficulty(undefined)).toBe(adaptiveDifficultyId)
		expect(normalizeDifficulty(99)).toBe(adaptiveDifficultyId)
	})

	it('sanitizes malformed skill maps to defaults', () => {
		expect(sanitizeAdaptiveSkillMap(undefined)).toEqual(defaultAdaptiveSkillMap)
		expect(sanitizeAdaptiveSkillMap([1, 2, 3])).toEqual(defaultAdaptiveSkillMap)
		expect(
			sanitizeAdaptiveSkillMap([1, 'x', Number.POSITIVE_INFINITY, -100])
		).toEqual([1, 0, 0, 0])
	})

	it('gains skill on correct, loses on incorrect', () => {
		// Correct answer increases skill
		expect(getUpdatedSkill(20, true, 2)).toBeGreaterThan(20)

		// Incorrect answer decreases skill
		expect(getUpdatedSkill(20, false, 3)).toBeLessThan(20)
	})

	it('penalizes slow incorrect answers more than fast ones', () => {
		const fastMiss = getUpdatedSkill(50, false, 1)
		const slowMiss = getUpdatedSkill(50, false, 11)
		expect(fastMiss).toBeGreaterThan(slowMiss)
		expect(fastMiss).toBeLessThan(50)
		expect(slowMiss).toBeLessThan(50)
	})

	it('caps skill to valid range', () => {
		// Best-case correct answer at 99 must still reach 100
		expect(getUpdatedSkill(99, true, 0)).toBeLessThanOrEqual(100)
		expect(getUpdatedSkill(99, true, 0)).toBeGreaterThanOrEqual(99)
		// Penalty at 1 should not drop below 0
		expect(getUpdatedSkill(1, false, 5)).toBe(0)
	})

	it('keeps custom adaptive addition/subtraction within configured bounds', () => {
		const lowSkill = getAdaptiveSettingsForOperator(
			Operator.Addition,
			0,
			customAdaptiveDifficultyId,
			[10, 20],
			[]
		)
		const highSkill = getAdaptiveSettingsForOperator(
			Operator.Addition,
			100,
			customAdaptiveDifficultyId,
			[10, 20],
			[]
		)

		// In custom mode, skill does not affect the range — user's chosen range is used as-is
		expect(lowSkill.range).toEqual([10, 20])
		expect(highSkill.range).toEqual([10, 20])
	})

	it('expands adaptive ranges and table sets as skill increases', () => {
		const lowAddition = getAdaptiveSettingsForOperator(
			Operator.Addition,
			0,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)
		const midAddition = getAdaptiveSettingsForOperator(
			Operator.Addition,
			50,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)
		const highAddition = getAdaptiveSettingsForOperator(
			Operator.Addition,
			100,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)

		// Low skill: range starts at the configured minimum upper bound
		expect(lowAddition.range[0]).toBe(1)
		expect(lowAddition.range[1]).toBe(
			adaptiveTuning.additionSubtractionMinUpperBound
		)

		// Mid skill: range is between low and high
		expect(midAddition.range[0]).toBeGreaterThan(lowAddition.range[0])
		expect(midAddition.range[1]).toBeGreaterThan(lowAddition.range[1])
		expect(midAddition.range[1]).toBeLessThan(highAddition.range[1])

		// High skill: upper bound reaches the full scale
		expect(highAddition.range[1]).toBe(
			adaptiveTuning.additionSubtractionUpperBoundBase +
				adaptiveTuning.additionSubtractionUpperBoundScale
		)

		// Monotonicity: ranges grow with skill
		for (let skill = 0; skill < 100; skill += 10) {
			const current = getAdaptiveSettingsForOperator(
				Operator.Addition,
				skill,
				adaptiveDifficultyId,
				[1, 20],
				[]
			)
			const next = getAdaptiveSettingsForOperator(
				Operator.Addition,
				skill + 10,
				adaptiveDifficultyId,
				[1, 20],
				[]
			)
			expect(next.range[1]).toBeGreaterThanOrEqual(current.range[1])
		}

		// Multiplication: low skill gets few tables, high skill gets many
		const lowMultiplication = getAdaptiveSettingsForOperator(
			Operator.Multiplication,
			0,
			adaptiveDifficultyId,
			[0, 0],
			[2, 3, 4]
		)
		const highMultiplication = getAdaptiveSettingsForOperator(
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
		expect(lowMultiplication.range[0]).toBe(adaptiveTuning.mulDivFactorMin)
		// At low skill, max factor is capped below the full range
		expect(lowMultiplication.range[1]).toBe(
			adaptiveTuning.mulDivFactorMaxAtMinSkill
		)

		// High skill: more tables unlocked, higher minimum factor
		expect(highMultiplication.possibleValues.length).toBeGreaterThan(
			lowMultiplication.possibleValues.length
		)
		expect(highMultiplication.range[0]).toBeGreaterThanOrEqual(
			adaptiveTuning.mulDivFactorMinAtMaxSkill
		)
	})

	it('keeps custom multiplication/division inside user-provided values', () => {
		const customLow = getAdaptiveSettingsForOperator(
			Operator.Multiplication,
			0,
			customAdaptiveDifficultyId,
			[0, 0],
			[3, 7, 9]
		)
		const customHigh = getAdaptiveSettingsForOperator(
			Operator.Multiplication,
			100,
			customAdaptiveDifficultyId,
			[0, 0],
			[3, 7, 9]
		)

		// In custom mode, skill does not affect tables or factor range
		expect(customLow.possibleValues).toEqual([3, 7, 9])
		expect(customLow.range).toEqual([1, 10])
		expect(customHigh.possibleValues).toEqual([3, 7, 9])
		expect(customHigh.range).toEqual([1, 10])
	})

	it('tracks skill trajectory properties for mixed outcomes', () => {
		const steps: Array<{
			isCorrect: boolean
			durationSeconds: number
		}> = [
			{ isCorrect: true, durationSeconds: 2 },
			{ isCorrect: true, durationSeconds: 5 },
			{ isCorrect: false, durationSeconds: 4 },
			{ isCorrect: true, durationSeconds: 3 },
			{ isCorrect: false, durationSeconds: 8 },
			{ isCorrect: true, durationSeconds: 1 },
			{ isCorrect: false, durationSeconds: 2 },
			{ isCorrect: true, durationSeconds: 8 },
			{ isCorrect: true, durationSeconds: 2 },
			{ isCorrect: true, durationSeconds: 3 }
		]

		let skill = 0
		let prevSkill = 0
		const progression: number[] = []

		for (const step of steps) {
			prevSkill = skill
			skill = getUpdatedSkill(skill, step.isCorrect, step.durationSeconds)
			progression.push(skill)

			// Correct answers never decrease, incorrect never increase
			if (step.isCorrect) {
				expect(skill).toBeGreaterThanOrEqual(prevSkill)
			} else {
				expect(skill).toBeLessThanOrEqual(prevSkill)
			}
		}

		// 7 correct, 3 wrong — net should be positive
		expect(skill).toBeGreaterThan(0)

		// Final skill should be modest (not skyrocketing from 10 answers)
		expect(skill).toBeLessThan(30)

		// Every value must be in valid range
		for (const s of progression) {
			expect(s).toBeGreaterThanOrEqual(0)
			expect(s).toBeLessThanOrEqual(100)
		}

		// Adaptive range at final skill should be low-end
		const adaptiveAtFinalSkill = getAdaptiveSettingsForOperator(
			Operator.Addition,
			skill,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)

		expect(adaptiveAtFinalSkill.range[1]).toBeLessThan(50)
		expect(adaptiveAtFinalSkill.range[0]).toBeGreaterThanOrEqual(1)
	})

	it('recovers from two misses with enough fast correct answers', () => {
		let skill = 40

		skill = getUpdatedSkill(skill, false, 4)
		skill = getUpdatedSkill(skill, false, 4)
		const afterMisses = skill

		// Fast correct answers should eventually recover the loss
		for (let i = 0; i < 10; i++) {
			skill = getUpdatedSkill(skill, true, 1)
		}

		expect(afterMisses).toBeLessThan(40)
		expect(skill).toBeGreaterThanOrEqual(40)
	})

	it('applies calibration boost for low-skill correct answers', () => {
		// At low skill, gains are positive (forward progress)
		const lowSkillGain = getUpdatedSkill(0, true, 0.5) - 0
		expect(lowSkillGain).toBeGreaterThan(0)

		// Speed-scaled gain at low skill is intentionally below mid-skill gain
		// to prevent rapid ramp-up on trivially easy puzzles
		const midSkillGain = getUpdatedSkill(50, true, 0.5) - 50
		expect(midSkillGain).toBeGreaterThan(0)
		expect(lowSkillGain).toBeLessThanOrEqual(midSkillGain)

		// Penalties should not be boosted — low-skill penalty ≤ high-skill penalty
		const lowSkillPenalty = 10 - getUpdatedSkill(10, false, 2)
		const highSkillPenalty = 50 - getUpdatedSkill(50, false, 2)
		expect(lowSkillPenalty).toBeLessThanOrEqual(highSkillPenalty)
	})

	it('tapers gain at high skill so reaching 100 requires sustained performance', () => {
		const midGain = getUpdatedSkill(50, true, 2) - 50
		const highGain = getUpdatedSkill(80, true, 2) - 80
		const topGain = getUpdatedSkill(95, true, 2) - 95

		// Gain should decrease as skill rises above the taper threshold
		expect(midGain).toBeGreaterThan(highGain)
		expect(highGain).toBeGreaterThan(topGain)

		// All should still be positive — correct answers always help
		expect(topGain).toBeGreaterThan(0)

		// Penalties are not tapered — high-skill wrong answers still hurt the same
		const midPenalty = 50 - getUpdatedSkill(50, false, 3)
		const highPenalty = 80 - getUpdatedSkill(80, false, 3)
		expect(midPenalty).toBe(highPenalty)
	})

	it('grants no skill for correct answers on puzzles well below current skill', () => {
		// difficultyRatio below threshold → no gain
		const lowRatio = 0.1
		expect(getUpdatedSkill(50, true, 2, lowRatio)).toBe(50)

		// difficultyRatio just under threshold → still no gain
		const atThreshold = 0.49
		expect(getUpdatedSkill(50, true, 2, atThreshold)).toBe(50)

		// difficultyRatio above threshold → gains skill
		const aboveThreshold = 0.7
		expect(getUpdatedSkill(50, true, 2, aboveThreshold)).toBeGreaterThan(50)

		// Wrong answers still penalise even with low ratio
		expect(getUpdatedSkill(50, false, 2, lowRatio)).toBeLessThan(50)
	})

	it('blends puzzle modes probabilistically based on skill', () => {
		// At skill 0, should almost always return Normal
		const lowRng = createRng(100).rng
		const lowSkillModes = Array.from({ length: 200 }, () =>
			getAdaptivePuzzleMode(lowRng, 0)
		)
		const lowNormalCount = lowSkillModes.filter(
			(m) => m === PuzzleMode.Normal
		).length
		expect(lowNormalCount).toBeGreaterThan(150)

		// At skill 50, should be mostly Alternate with some Normal and Random
		const midRng = createRng(200).rng
		const midSkillModes = Array.from({ length: 200 }, () =>
			getAdaptivePuzzleMode(midRng, 50)
		)
		const midAlternateCount = midSkillModes.filter(
			(m) => m === PuzzleMode.Alternate
		).length
		expect(midAlternateCount).toBeGreaterThan(50)

		// At skill 95, should be mostly Random
		const highRng = createRng(300).rng
		const highSkillModes = Array.from({ length: 200 }, () =>
			getAdaptivePuzzleMode(highRng, 95)
		)
		const highRandomCount = highSkillModes.filter(
			(m) => m === PuzzleMode.Random
		).length
		expect(highRandomCount).toBeGreaterThan(150)
	})

	it('scores addition difficulty by operand magnitude', () => {
		// Tiny operands → low difficulty
		const trivial = getPuzzleDifficulty(Operator.Addition, makeAddParts(1, 2))
		expect(trivial).toBeLessThanOrEqual(6)

		// Medium operands → medium difficulty
		const medium = getPuzzleDifficulty(Operator.Addition, makeAddParts(42, 35))
		expect(medium).toBeGreaterThan(30)
		expect(medium).toBeLessThan(70)

		// Large operands → high difficulty
		const hard = getPuzzleDifficulty(Operator.Addition, makeAddParts(153, 182))
		expect(hard).toBeGreaterThan(80)

		// Monotonically increasing
		expect(trivial).toBeLessThan(medium)
		expect(medium).toBeLessThan(hard)
	})

	it('discounts no-carry puzzles and boosts carry puzzles', () => {
		// 20+9 (no carry, trivially easy) should score LOWER than
		// 16+6 (one carry) despite having a larger major operand.
		const noCarry = getPuzzleDifficulty(Operator.Addition, makeAddParts(20, 9))
		const withCarry = getPuzzleDifficulty(
			Operator.Addition,
			makeAddParts(16, 6)
		)
		expect(withCarry).toBeGreaterThan(noCarry)

		// 1+10 (no carry) should score lower than 4+8 (one carry)
		const noCarrySmall = getPuzzleDifficulty(
			Operator.Addition,
			makeAddParts(1, 10)
		)
		const withCarrySmall = getPuzzleDifficulty(
			Operator.Addition,
			makeAddParts(4, 8)
		)
		expect(withCarrySmall).toBeGreaterThan(noCarrySmall)
	})

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

	it('scores subtraction difficulty relative to subtraction range', () => {
		// Hardest subtraction operands (near max range 100) → high difficulty
		const hard = getPuzzleDifficulty(
			Operator.Subtraction,
			makeSubParts(100, 95)
		)
		expect(hard).toBeGreaterThan(80)

		// Medium subtraction → medium difficulty
		const medium = getPuzzleDifficulty(
			Operator.Subtraction,
			makeSubParts(52, 31)
		)
		expect(medium).toBeGreaterThan(30)
		expect(medium).toBeLessThan(85)

		// Monotonically increasing
		const trivial = getPuzzleDifficulty(
			Operator.Subtraction,
			makeSubParts(3, 1)
		)
		expect(trivial).toBeLessThan(medium)
		expect(medium).toBeLessThan(hard)
	})

	it('scores multiplication difficulty by table hardness and factor', () => {
		// Easy table, small factor
		const easy = getPuzzleDifficulty(
			Operator.Multiplication,
			makeMulParts(1, 2)
		)

		// Hard table, large factor
		const hard = getPuzzleDifficulty(
			Operator.Multiplication,
			makeMulParts(12, 9)
		)

		// Large table with factor shortcut should be easier than factor 9
		const shortcut = getPuzzleDifficulty(
			Operator.Multiplication,
			makeMulParts(13, 10)
		)

		// Hardest possible
		const hardest = getPuzzleDifficulty(
			Operator.Multiplication,
			makeMulParts(14, 9)
		)

		expect(easy).toBeLessThan(20)
		expect(hard).toBeGreaterThan(60)
		expect(hardest).toBe(100)
		expect(easy).toBeLessThan(hard)
		expect(shortcut).toBeLessThan(60)
		expect(shortcut).toBeLessThan(
			getPuzzleDifficulty(Operator.Multiplication, makeMulParts(13, 9))
		)
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

	it('scores division difficulty consistently with multiplication', () => {
		// Division by hard table should be difficult
		const hard = getPuzzleDifficulty(Operator.Division, makeDivParts(12, 8))
		const easy = getPuzzleDifficulty(Operator.Division, makeDivParts(1, 3))

		expect(hard).toBeGreaterThan(easy)
		expect(easy).toBeLessThan(30)
	})

	it('computes difficulty ratio with +1 offset for zero safety', () => {
		// Puzzle matches skill → ratio 1.0
		expect(getDifficultyRatio(50, 50)).toBe(1)

		// Puzzle easier than skill → ratio < 1
		expect(getDifficultyRatio(25, 50)).toBeCloseTo(26 / 51, 2)

		// Puzzle harder than skill → clamped to 1.0
		expect(getDifficultyRatio(80, 40)).toBe(1)

		// Trivial puzzle at high skill → near zero
		expect(getDifficultyRatio(0, 100)).toBeCloseTo(1 / 101, 2)

		// Skill 0 → ratio always 1 (beginners always get full gains)
		expect(getDifficultyRatio(5, 0)).toBe(1)

		// Both zero → ratio 1 (appropriate puzzle for the level)
		expect(getDifficultyRatio(0, 0)).toBe(1)
	})

	it('scales gains down for easy puzzles via difficultyRatio', () => {
		const fullGain = getUpdatedSkill(50, true, 2, 1.0) - 50
		const halfGain = getUpdatedSkill(50, true, 2, 0.5) - 50
		const zeroGain = getUpdatedSkill(50, true, 2, 0.0) - 50

		expect(fullGain).toBeGreaterThan(0)
		expect(halfGain).toBeGreaterThanOrEqual(0)
		expect(halfGain).toBeLessThan(fullGain)
		expect(zeroGain).toBe(0)
	})

	it('does not scale penalties by difficultyRatio', () => {
		// Wrong answers should always penalize fully regardless of difficulty
		const fullPenalty = 50 - getUpdatedSkill(50, false, 3, 1.0)
		const lowRatioPenalty = 50 - getUpdatedSkill(50, false, 3, 0.1)

		expect(fullPenalty).toBe(lowRatioPenalty)
	})

	it('prevents trivial custom puzzles from inflating skill', () => {
		// Simulate: player at skill 60 answering 1+2=3 repeatedly
		const trivialParts: PuzzlePartSet = [
			{ generatedValue: 1, userDefinedValue: undefined },
			{ generatedValue: 2, userDefinedValue: undefined },
			{ generatedValue: 3, userDefinedValue: undefined }
		] as PuzzlePartSet

		let skill = 60
		for (let i = 0; i < 20; i++) {
			const difficulty = getPuzzleDifficulty(Operator.Addition, trivialParts)
			const ratio = getDifficultyRatio(difficulty, skill)
			skill = getUpdatedSkill(skill, true, 1, ratio)
		}

		// After 20 trivial puzzles at skill 60, should barely move
		expect(skill).toBeLessThan(65)
	})

	it('allows progression at very high skill with fast correct answers', () => {
		// Regression: a double-floor bug caused skill 97+ to be an impassable wall
		// because floor(scaledDelta) × floor(ratio) always rounded to 0.
		const gain97fast = getUpdatedSkill(97, true, 1, 0.9) - 97
		const gain99fast = getUpdatedSkill(99, true, 1, 0.9) - 99

		expect(gain97fast).toBeGreaterThan(0)
		expect(gain99fast).toBeGreaterThan(0)

		// Slow answers at 97+ should still stall
		const gain97slow = getUpdatedSkill(97, true, 4, 0.9) - 97
		expect(gain97slow).toBe(0)
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

	// ── Alignment tests: difficulty scores must track skill level ────────
	// If these tests fail, operator-specific tuning has drifted away from the
	// shared 0–100 skill scale.
	const sampleDifficultyMedian = (
		op: Operator,
		skill: number,
		samplesPerSkill: number
	): number => {
		const settings = getAdaptiveSettingsForOperator(
			op,
			skill,
			adaptiveDifficultyId,
			[1, 200],
			[]
		)
		const { rng } = createRng(
			10_000 + op * 1_000 + skill * 10 + samplesPerSkill
		)

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

	it('difficulty scores track skill level for addition and subtraction', () => {
		const SAMPLES_PER_SKILL = 200
		const MAX_GAP = 15
		const skillLevels = [20, 40, 60, 80]

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
		const observations: string[] = []
		const failures: string[] = []
		const skillLevels = [20, 40, 60, 80]

		for (const op of [Operator.Multiplication, Operator.Division]) {
			const label =
				op === Operator.Multiplication ? 'multiplication' : 'division'
			for (const skill of skillLevels) {
				const median = sampleDifficultyMedian(op, skill, SAMPLES_PER_SKILL)
				const gap = Math.abs(median - skill)
				observations.push(`${label}@${skill}=median${median},gap${gap}`)
				if (gap > MAX_GAP) {
					failures.push(
						`${label} at skill ${skill}: median difficulty ${median} ` +
							`deviates by ${gap} (max ${MAX_GAP})`
					)
				}
			}
		}

		expect(failures, `Observed medians: ${observations.join('; ')}`).toEqual([])
	})

	it('difficulty standards stay broadly consistent across operators', () => {
		const SAMPLES_PER_SKILL = 300
		const MAX_SPREAD = 25
		const skillLevels = [20, 40, 60, 80]
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
			expect(
				spread,
				`skill ${skill}: operator medians ${medians.join(', ')} ` +
					`spread by ${spread} (max ${MAX_SPREAD})`
			).toBeLessThanOrEqual(MAX_SPREAD)
		}
	})

	it('high-skill multiplication/division keep repeat rate low with recent-history filtering', () => {
		const historySize = 5
		const maxAttempts = 10
		const sequenceLength = 80
		const maxRecentRepeatRate = 0.1

		const buildPool = (op: Operator, skill: number): string[] => {
			const settings = getAdaptiveSettingsForOperator(
				op,
				skill,
				adaptiveDifficultyId,
				[1, 200],
				[]
			)
			const pool: string[] = []
			for (const table of settings.possibleValues) {
				for (
					let factor = settings.range[0];
					factor <= settings.range[1];
					factor++
				) {
					const signature =
						op === Operator.Multiplication
							? `${table}|${factor}|${table * factor}`
							: `${table * factor}|${table}|${factor}`
					pool.push(signature)
				}
			}
			return pool
		}

		const simulateSequence = (pool: string[], seed: number): string[] => {
			const { rng } = createRng(seed)
			const recent: string[] = []
			const sequence: string[] = []

			for (let i = 0; i < sequenceLength; i++) {
				let chosen = pool[nextInt(rng, 0, pool.length - 1)]!
				for (let attempt = 0; attempt < maxAttempts; attempt++) {
					const candidate = pool[nextInt(rng, 0, pool.length - 1)]!
					if (!recent.includes(candidate)) {
						chosen = candidate
						break
					}
					chosen = candidate
				}

				sequence.push(chosen)
				recent.push(chosen)
				if (recent.length > historySize) recent.shift()
			}

			return sequence
		}

		const recentRepeatRate = (sequence: string[]): number => {
			let repeats = 0
			for (let i = 0; i < sequence.length; i++) {
				const start = Math.max(0, i - historySize)
				const recent = sequence.slice(start, i)
				if (recent.includes(sequence[i]!)) repeats++
			}
			return repeats / sequence.length
		}

		for (const op of [Operator.Multiplication, Operator.Division]) {
			for (const skill of [80, 100]) {
				const pool = buildPool(op, skill)
				expect(pool.length).toBeGreaterThanOrEqual(30)

				const sequence = simulateSequence(pool, 70_000 + op * 1_000 + skill)
				const repeatRate = recentRepeatRate(sequence)
				expect(
					repeatRate,
					`operator ${op} skill ${skill}: repeatRate=${repeatRate.toFixed(3)}`
				).toBeLessThanOrEqual(maxRecentRepeatRate)
			}
		}
	})

	// ── Fuzz tests: invariants that must hold across random inputs ────────
	const FUZZ_ITERATIONS = 500
	const randomInt = (min: number, max: number) =>
		Math.floor(Math.random() * (max - min + 1)) + min
	const randomFloat = (min: number, max: number) =>
		Math.random() * (max - min) + min

	it('fuzz: getUpdatedSkill always returns an integer in [0, 100]', () => {
		for (let i = 0; i < FUZZ_ITERATIONS; i++) {
			const skill = randomInt(-50, 150)
			const isCorrect = Math.random() > 0.5
			const duration = randomFloat(-5, 30)
			const ratio = randomFloat(-1, 2)

			const result = getUpdatedSkill(skill, isCorrect, duration, ratio)

			expect(Number.isFinite(result)).toBe(true)
			expect(Number.isInteger(result)).toBe(true)
			expect(result).toBeGreaterThanOrEqual(0)
			expect(result).toBeLessThanOrEqual(100)
		}
	})

	it('fuzz: correct answers never decrease skill', () => {
		for (let i = 0; i < FUZZ_ITERATIONS; i++) {
			const skill = randomInt(0, 100)
			const duration = randomFloat(0, 15)
			const ratio = randomFloat(0, 1)

			const result = getUpdatedSkill(skill, true, duration, ratio)
			expect(result).toBeGreaterThanOrEqual(skill)
		}
	})

	it('fuzz: incorrect answers never increase skill', () => {
		for (let i = 0; i < FUZZ_ITERATIONS; i++) {
			const skill = randomInt(0, 100)
			const duration = randomFloat(0, 15)

			const result = getUpdatedSkill(skill, false, duration)
			expect(result).toBeLessThanOrEqual(skill)
		}
	})

	it('fuzz: getDifficultyRatio always returns a value in [0, 1]', () => {
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

	it('fuzz: multi-round skill trajectory stays in [0, 100]', () => {
		for (let trial = 0; trial < 50; trial++) {
			let skill = randomInt(0, 100)

			for (let round = 0; round < 100; round++) {
				const isCorrect = Math.random() > 0.4
				const duration = randomFloat(0.5, 10)
				const ratio = randomFloat(0.1, 1)

				skill = getUpdatedSkill(skill, isCorrect, duration, ratio)

				expect(skill).toBeGreaterThanOrEqual(0)
				expect(skill).toBeLessThanOrEqual(100)
				expect(Number.isInteger(skill)).toBe(true)
			}
		}
	})

	it('fuzz: getAdaptiveSettingsForOperator never returns degenerate ranges', () => {
		const addSubOps = [Operator.Addition, Operator.Subtraction]
		const mulDivOps = [Operator.Multiplication, Operator.Division]
		const difficulties = [
			adaptiveDifficultyId,
			customAdaptiveDifficultyId
		] as const

		for (let i = 0; i < FUZZ_ITERATIONS; i++) {
			const skill = randomInt(-10, 110)
			const difficulty = difficulties[randomInt(0, 1)]!

			// Addition / Subtraction
			const addOp = addSubOps[randomInt(0, 1)]!
			const rangeMin = randomInt(1, 50)
			const rangeMax = randomInt(rangeMin + 2, rangeMin + 100)
			const addResult = getAdaptiveSettingsForOperator(
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
			const mulResult = getAdaptiveSettingsForOperator(
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

	it('applySkillUpdate mutates the skill map and returns the new skill', () => {
		const skillMap = [50, 50, 50, 50] as AdaptiveSkillMap
		const parts: PuzzlePartSet = [
			{ generatedValue: 31, userDefinedValue: undefined },
			{ generatedValue: 22, userDefinedValue: undefined },
			{ generatedValue: 53, userDefinedValue: undefined }
		] as PuzzlePartSet

		const newSkill = applySkillUpdate(
			skillMap,
			Operator.Addition,
			parts,
			true,
			2
		)

		expect(newSkill).toBeGreaterThan(50)
		expect(skillMap[Operator.Addition]).toBe(newSkill)
		// Other operators unchanged
		expect(skillMap[Operator.Subtraction]).toBe(50)
		expect(skillMap[Operator.Multiplication]).toBe(50)
		expect(skillMap[Operator.Division]).toBe(50)
	})

	it('uses separate exponents for addition and subtraction difficulty', () => {
		// Same operand magnitude — subtraction should score higher difficulty
		// because its exponent (1.9) is steeper than addition's (1.7),
		// making the inverse (1/exp) smaller and thus the curve more aggressive.
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

	it('uses separate exponents for addition and subtraction ranges', () => {
		const addSettings = getAdaptiveSettingsForOperator(
			Operator.Addition,
			50,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)
		const subSettings = getAdaptiveSettingsForOperator(
			Operator.Subtraction,
			50,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)

		// Subtraction has a steeper exponent, so its upper bound grows slower
		expect(subSettings.range[1]).toBeLessThan(addSettings.range[1])
	})

	it('boosts gain after a streak of consecutive correct answers', () => {
		const noStreakGain = getUpdatedSkill(40, true, 1, 1, 0) - 40
		const belowThresholdGain = getUpdatedSkill(40, true, 1, 1, 7) - 40
		const streakGain = getUpdatedSkill(40, true, 1, 1, 8) - 40

		// Below threshold — no boost
		expect(belowThresholdGain).toBe(noStreakGain)

		// At threshold — boosted
		expect(streakGain).toBeGreaterThan(noStreakGain)
	})

	it('scales max answer duration with skill level', () => {
		// At skill 0: effectiveMax = 6s, so a 7s answer is clamped to 6
		// At skill 100: effectiveMax = 8s, so a 7s answer is within bounds
		// Faster effective speed at high skill means less penalty for same absolute time
		const penaltyLowSkill = 10 - getUpdatedSkill(10, false, 7)
		const penaltyHighSkill = 80 - getUpdatedSkill(80, false, 7)

		// At low skill, 7s is clamped to maxDurationSeconds (6), so maximum slowness = 1.0
		// At high skill, 7s is well within effectiveMax (~7.6), so slowness < 1.0
		expect(penaltyLowSkill).toBeGreaterThanOrEqual(penaltyHighSkill)
	})

	it('reduces range during incorrect cooldown', () => {
		const normalSettings = getAdaptiveSettingsForOperator(
			Operator.Addition,
			50,
			adaptiveDifficultyId,
			[1, 20],
			[],
			0
		)
		const cooldownSettings = getAdaptiveSettingsForOperator(
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
		const settings = getAdaptiveSettingsForOperator(
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
		const laggedSettings = getAdaptiveSettingsForOperator(
			Operator.Addition,
			30 - adaptiveTuning.additionSubtractionSecondOperandSkillLag,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)
		expect(settings.secondaryRange![1]).toBe(laggedSettings.range[1])
	})

	it('starts lagged addition operand growth by mid-teens skill', () => {
		const atLag = getAdaptiveSettingsForOperator(
			Operator.Addition,
			adaptiveTuning.additionSubtractionSecondOperandSkillLag,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)
		const justAboveLag = getAdaptiveSettingsForOperator(
			Operator.Addition,
			adaptiveTuning.additionSubtractionSecondOperandSkillLag + 5,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)

		expect(atLag.secondaryRange![1]).toBe(
			adaptiveTuning.additionSubtractionMinUpperBound
		)
		expect(justAboveLag.secondaryRange![1]).toBeGreaterThan(
			atLag.secondaryRange![1]
		)
	})

	it('starts lagged subtraction operand growth by low twenties skill', () => {
		const atLag = getAdaptiveSettingsForOperator(
			Operator.Subtraction,
			adaptiveTuning.additionSubtractionSecondOperandSkillLag,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)
		const justAboveLag = getAdaptiveSettingsForOperator(
			Operator.Subtraction,
			adaptiveTuning.additionSubtractionSecondOperandSkillLag + 10,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)

		expect(atLag.secondaryRange![1]).toBe(
			adaptiveTuning.additionSubtractionMinUpperBound
		)
		expect(justAboveLag.secondaryRange![1]).toBeGreaterThan(
			atLag.secondaryRange![1]
		)
	})

	it('secondary range converges with primary at high skill', () => {
		// At high skill, the lag becomes negligible relative to the range size
		const settings = getAdaptiveSettingsForOperator(
			Operator.Addition,
			100,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)

		// Both should be large and relatively close together
		expect(settings.range[1]).toBe(
			adaptiveTuning.additionSubtractionUpperBoundBase +
				adaptiveTuning.additionSubtractionUpperBoundScale
		)
		expect(settings.secondaryRange![1]).toBeGreaterThan(70)
	})

	it('secondary range is absent in custom mode', () => {
		const settings = getAdaptiveSettingsForOperator(
			Operator.Addition,
			50,
			customAdaptiveDifficultyId,
			[10, 20],
			[]
		)

		expect(settings.secondaryRange).toBeUndefined()
	})
})
