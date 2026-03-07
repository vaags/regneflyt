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
	normalizeDifficulty,
	sanitizeAdaptiveSkillMap
} from '../../src/helpers/adaptiveHelper'
import { Operator } from '../../src/models/constants/Operator'
import { PuzzleMode } from '../../src/models/constants/PuzzleMode'

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
		expect(getUpdatedSkill(98, true, 2)).toBe(100)
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
		expect(highMultiplication.possibleValues).toEqual([
			4, 3, 9, 11, 6, 8, 7, 12, 13, 14
		])
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
		expect(customHigh.possibleValues).toEqual([3, 7, 9])
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

		expect(progression).toEqual([6, 9, 5, 11, 6, 13, 9, 10, 16, 21])

		const adaptiveAtFinalSkill = getAdaptiveSettingsForOperator(
			Operator.Addition,
			skill,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)

		expect(adaptiveAtFinalSkill.range).toEqual([1, 25])
	})

	it('recovers from two misses with three correct answers', () => {
		let skill = 40

		skill = getUpdatedSkill(skill, false, 4)
		skill = getUpdatedSkill(skill, false, 4)
		const afterMisses = skill
		skill = getUpdatedSkill(skill, true, 4)
		skill = getUpdatedSkill(skill, true, 4)
		skill = getUpdatedSkill(skill, true, 4)

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
})
