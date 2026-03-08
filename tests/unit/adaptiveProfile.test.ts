import { describe, expect, it } from 'vitest'
import {
	adaptiveDifficultyId,
	customAdaptiveDifficultyId,
	defaultAdaptiveSkillMap
} from '../../src/models/AdaptiveProfile'
import {
	getAdaptivePuzzleMode,
	getAdaptiveSettingsForOperator,
	getUpdatedSkill,
	getPuzzleDifficulty,
	getDifficultyRatio,
	normalizeDifficulty,
	sanitizeAdaptiveSkillMap
} from '../../src/helpers/adaptiveHelper'
import { Operator } from '../../src/models/constants/Operator'
import { PuzzleMode } from '../../src/models/constants/PuzzleMode'
import type { PuzzlePartSet } from '../../src/models/Puzzle'

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
		expect(getUpdatedSkill(99, true, 1)).toBe(100)
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

		expect(lowSkill.range[0]).toBeGreaterThanOrEqual(10)
		expect(lowSkill.range[1]).toBeLessThanOrEqual(20)
		expect(highSkill.range[0]).toBeGreaterThanOrEqual(10)
		expect(highSkill.range[1]).toBeLessThanOrEqual(20)
		expect(highSkill.range[1]).toBeGreaterThan(highSkill.range[0])
		expect(highSkill.range).toEqual([19, 20])
	})

	it('expands adaptive ranges and table sets as skill increases', () => {
		const lowAddition = getAdaptiveSettingsForOperator(
			Operator.Addition,
			0,
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
		expect(lowAddition.range).toEqual([1, 5])
		expect(highAddition.range).toEqual([50, 200])

		const midAddition = getAdaptiveSettingsForOperator(
			Operator.Addition,
			50,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)
		expect(midAddition.range[0]).toBeGreaterThan(1)
		expect(midAddition.range[1]).toBeLessThan(200)

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
		expect(lowMultiplication.possibleValues).toEqual([1, 10])
		expect(lowMultiplication.range).toEqual([1, 10])
		expect(highMultiplication.possibleValues).toEqual([11, 6, 8, 7, 12, 13, 14])
		expect(highMultiplication.range).toEqual([4, 10])
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
		expect(customLow.possibleValues).toEqual([3])
		expect(customLow.range).toEqual([1, 10])
		expect(customHigh.possibleValues).toEqual([3, 7, 9])
		expect(customHigh.range).toEqual([4, 10])
	})

	it('tracks expected 10-step skill trajectory for mixed outcomes', () => {
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
		const progression: number[] = []

		for (const step of steps) {
			skill = getUpdatedSkill(skill, step.isCorrect, step.durationSeconds)
			progression.push(skill)
		}

		expect(progression).toEqual([6, 8, 4, 9, 4, 11, 7, 8, 14, 18])

		const adaptiveAtFinalSkill = getAdaptiveSettingsForOperator(
			Operator.Addition,
			skill,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)

		expect(adaptiveAtFinalSkill.range).toEqual([1, 21])
	})

	it('recovers from two misses with three correct answers', () => {
		let skill = 40

		skill = getUpdatedSkill(skill, false, 4)
		skill = getUpdatedSkill(skill, false, 4)
		const afterMisses = skill
		skill = getUpdatedSkill(skill, true, 3)
		skill = getUpdatedSkill(skill, true, 3)
		skill = getUpdatedSkill(skill, true, 3)

		expect(afterMisses).toBeLessThan(40)
		expect(skill).toBeGreaterThanOrEqual(40)
	})

	it('applies calibration boost for low-skill correct answers', () => {
		const boostedGain = getUpdatedSkill(0, true, 2) - 0
		const normalGain = getUpdatedSkill(50, true, 2) - 50

		// Low-skill gain should be larger due to calibration boost
		expect(boostedGain).toBeGreaterThan(normalGain)

		// Both should be positive
		expect(boostedGain).toBeGreaterThan(0)
		expect(normalGain).toBeGreaterThan(0)

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

	it('transitions adaptive puzzle mode gradually with hysteresis', () => {
		expect(getAdaptivePuzzleMode(30, PuzzleMode.Normal)).toBe(PuzzleMode.Normal)
		expect(getAdaptivePuzzleMode(40, PuzzleMode.Normal)).toBe(
			PuzzleMode.Alternate
		)

		expect(getAdaptivePuzzleMode(72, PuzzleMode.Alternate)).toBe(
			PuzzleMode.Alternate
		)
		expect(getAdaptivePuzzleMode(75, PuzzleMode.Alternate)).toBe(
			PuzzleMode.Random
		)

		expect(getAdaptivePuzzleMode(66, PuzzleMode.Random)).toBe(PuzzleMode.Random)
		expect(getAdaptivePuzzleMode(64, PuzzleMode.Random)).toBe(
			PuzzleMode.Alternate
		)

		expect(getAdaptivePuzzleMode(29, PuzzleMode.Alternate)).toBe(
			PuzzleMode.Normal
		)
	})

	it('scores addition difficulty by operand magnitude', () => {
		const makeParts = (a: number, b: number): PuzzlePartSet =>
			[
				{ generatedValue: a, userDefinedValue: undefined },
				{ generatedValue: b, userDefinedValue: undefined },
				{ generatedValue: a + b, userDefinedValue: undefined }
			] as PuzzlePartSet

		// Tiny operands → low difficulty
		const trivial = getPuzzleDifficulty(Operator.Addition, makeParts(1, 2))
		expect(trivial).toBeLessThanOrEqual(5)

		// Medium operands → medium difficulty
		const medium = getPuzzleDifficulty(Operator.Addition, makeParts(40, 35))
		expect(medium).toBeGreaterThan(30)
		expect(medium).toBeLessThan(70)

		// Large operands → high difficulty
		const hard = getPuzzleDifficulty(Operator.Addition, makeParts(150, 180))
		expect(hard).toBeGreaterThan(80)

		// Monotonically increasing
		expect(trivial).toBeLessThan(medium)
		expect(medium).toBeLessThan(hard)
	})

	it('scores multiplication difficulty by table hardness and factor', () => {
		const makeMulParts = (table: number, factor: number): PuzzlePartSet =>
			[
				{ generatedValue: table, userDefinedValue: undefined },
				{ generatedValue: factor, userDefinedValue: undefined },
				{ generatedValue: table * factor, userDefinedValue: undefined }
			] as PuzzlePartSet

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

		// Hardest possible
		const hardest = getPuzzleDifficulty(
			Operator.Multiplication,
			makeMulParts(14, 10)
		)

		expect(easy).toBeLessThan(20)
		expect(hard).toBeGreaterThan(60)
		expect(hardest).toBe(100)
		expect(easy).toBeLessThan(hard)
	})

	it('scores division difficulty consistently with multiplication', () => {
		const makeDivParts = (table: number, factor: number): PuzzlePartSet =>
			[
				{ generatedValue: table * factor, userDefinedValue: undefined },
				{ generatedValue: table, userDefinedValue: undefined },
				{ generatedValue: factor, userDefinedValue: undefined }
			] as PuzzlePartSet

		// Division by hard table should be difficult
		const hard = getPuzzleDifficulty(Operator.Division, makeDivParts(12, 8))
		const easy = getPuzzleDifficulty(Operator.Division, makeDivParts(1, 3))

		expect(hard).toBeGreaterThan(easy)
		expect(easy).toBeLessThan(20)
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
})
