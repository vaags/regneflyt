import { describe, expect, it } from 'vitest'
import {
	adaptiveDifficultyId,
	customAdaptiveDifficultyId,
	defaultAdaptiveSkillMap,
	getAdaptivePuzzleMode,
	getAdaptiveSettingsForOperator,
	getUpdatedSkill,
	normalizeDifficulty,
	sanitizeAdaptiveSkillMap
} from '../../src/models/AdaptiveProfile'
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

	it('gains skill on correct, loses on incorrect and timeout', () => {
		// Correct answer increases skill
		expect(getUpdatedSkill(20, true, 2, false)).toBeGreaterThan(20)

		// Incorrect answer decreases skill
		expect(getUpdatedSkill(20, false, 3, false)).toBeLessThan(20)

		// Timeout decreases skill
		expect(getUpdatedSkill(20, false, 3, true)).toBeLessThan(20)

		// Timeout is harsher than incorrect
		expect(getUpdatedSkill(20, false, 3, true)).toBeLessThan(
			getUpdatedSkill(20, false, 3, false)
		)
	})

	it('penalizes slow incorrect answers more than fast ones', () => {
		const fastMiss = getUpdatedSkill(50, false, 1, false)
		const slowMiss = getUpdatedSkill(50, false, 11, false)
		expect(fastMiss).toBeGreaterThan(slowMiss)
		expect(fastMiss).toBeLessThan(50)
		expect(slowMiss).toBeLessThan(50)
	})

	it('caps skill to valid range', () => {
		expect(getUpdatedSkill(98, true, 2, false)).toBe(100)
		expect(getUpdatedSkill(1, false, 5, false)).toBe(0)
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
			timeout: boolean
		}> = [
			{ isCorrect: true, durationSeconds: 2, timeout: false },
			{ isCorrect: true, durationSeconds: 5, timeout: false },
			{ isCorrect: false, durationSeconds: 4, timeout: false },
			{ isCorrect: true, durationSeconds: 3, timeout: false },
			{ isCorrect: false, durationSeconds: 8, timeout: true },
			{ isCorrect: true, durationSeconds: 1, timeout: false },
			{ isCorrect: false, durationSeconds: 2, timeout: false },
			{ isCorrect: true, durationSeconds: 8, timeout: false },
			{ isCorrect: true, durationSeconds: 2, timeout: false },
			{ isCorrect: true, durationSeconds: 3, timeout: false }
		]

		let skill = 0
		const progression: number[] = []

		for (const step of steps) {
			skill = getUpdatedSkill(
				skill,
				step.isCorrect,
				step.durationSeconds,
				step.timeout
			)
			progression.push(skill)
		}

		expect(progression).toEqual([6, 9, 5, 11, 5, 12, 8, 9, 15, 20])

		const adaptiveAtFinalSkill = getAdaptiveSettingsForOperator(
			Operator.Addition,
			skill,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)

		expect(adaptiveAtFinalSkill.range).toEqual([1, 24])
	})

	it('recovers from two misses with three correct answers', () => {
		let skill = 40

		skill = getUpdatedSkill(skill, false, 4, false)
		skill = getUpdatedSkill(skill, false, 4, false)
		const afterMisses = skill
		skill = getUpdatedSkill(skill, true, 4, false)
		skill = getUpdatedSkill(skill, true, 4, false)
		skill = getUpdatedSkill(skill, true, 4, false)

		expect(afterMisses).toBeLessThan(40)
		expect(skill).toBeGreaterThanOrEqual(40)
	})

	it('applies calibration boost for low-skill correct answers', () => {
		const boostedGain = getUpdatedSkill(0, true, 2, false) - 0
		const normalGain = getUpdatedSkill(50, true, 2, false) - 50

		// Low-skill gain should be larger due to calibration boost
		expect(boostedGain).toBeGreaterThan(normalGain)

		// Both should be positive
		expect(boostedGain).toBeGreaterThan(0)
		expect(normalGain).toBeGreaterThan(0)

		// Penalties should not be boosted — low-skill penalty ≤ high-skill penalty
		const lowSkillPenalty = 10 - getUpdatedSkill(10, false, 2, false)
		const highSkillPenalty = 50 - getUpdatedSkill(50, false, 2, false)
		expect(lowSkillPenalty).toBeLessThanOrEqual(highSkillPenalty)
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
