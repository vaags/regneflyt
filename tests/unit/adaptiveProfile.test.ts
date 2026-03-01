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

	it('updates skill slower on correct answers and penalizes wrong answers', () => {
		expect(getUpdatedSkill(0, true, 2, false)).toBe(7)
		expect(getUpdatedSkill(0, true, 3, false)).toBeLessThanOrEqual(7)
		expect(getUpdatedSkill(20, false, 3, false)).toBe(12)
		expect(getUpdatedSkill(20, false, 3, true)).toBe(11)
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
		expect(lowAddition.range).toEqual([1, 2])
		expect(highAddition.range).toEqual([1, 200])

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
		expect(lowMultiplication.possibleValues).toEqual([1])
		expect(highMultiplication.possibleValues).toEqual([
			1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
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

		expect(progression).toEqual([7, 13, 5, 12, 3, 11, 3, 7, 14, 21])

		const adaptiveAtFinalSkill = getAdaptiveSettingsForOperator(
			Operator.Addition,
			skill,
			adaptiveDifficultyId,
			[1, 20],
			[]
		)

		expect(adaptiveAtFinalSkill.range).toEqual([1, 23])
	})

	it('is less punishing on mixed miss-recovery sequences', () => {
		let skill = 40

		skill = getUpdatedSkill(skill, false, 4, false)
		skill = getUpdatedSkill(skill, false, 4, false)
		skill = getUpdatedSkill(skill, true, 4, false)
		skill = getUpdatedSkill(skill, true, 4, false)
		skill = getUpdatedSkill(skill, true, 4, false)

		expect(skill).toBe(42)
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
