import { describe, expect, it } from 'vitest'
import { Operator } from '#lib/domain/arithmetic/operator.ts'
import type { PuzzlePartSet } from '#lib/domain/puzzle-generation/puzzle.ts'
import {
	createRng,
	nextFloat,
	nextInt
} from '#lib/domain/puzzle-generation/random.ts'
import { resolveOperatorPuzzleSettings } from '#lib/domain/puzzle-generation/skillBasedPuzzleSettings.ts'
import { adaptiveDifficultyId } from '#lib/domain/skill-progression/difficultyMode.ts'
import type { OperatorSkillMap } from '#lib/domain/skill-progression/skillModel.ts'
import { applySkillUpdate } from '#lib/domain/skill-progression/skillProgression.ts'
import { getUpdatedSkill } from '#lib/domain/skill-progression/skillUpdate.ts'

const createFuzzHelpers = (seed: number) => {
	const rng = createRng(seed).rng
	return {
		randomBool: (threshold = 0.5) => nextFloat(rng) > threshold,
		randomFloat: (min: number, max: number) =>
			nextFloat(rng) * (max - min) + min,
		randomInt: (min: number, max: number) => nextInt(rng, min, max)
	}
}

describe('skillProgression', () => {
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
		const adaptiveAtFinalSkill = resolveOperatorPuzzleSettings(
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

	it('fuzz: multi-round skill trajectory stays in [0, 100]', () => {
		const { randomBool, randomFloat, randomInt } = createFuzzHelpers(91_342)
		for (let trial = 0; trial < 10; trial++) {
			let skill = randomInt(0, 100)

			for (let round = 0; round < 30; round++) {
				const isCorrect = randomBool(0.4)
				const duration = randomFloat(0.5, 10)
				const ratio = randomFloat(0.1, 1)

				skill = getUpdatedSkill(skill, isCorrect, duration, ratio)

				expect(skill).toBeGreaterThanOrEqual(0)
				expect(skill).toBeLessThanOrEqual(100)
				expect(Number.isInteger(skill)).toBe(true)
			}
		}
	})

	it('applySkillUpdate mutates the skill map and returns the new skill', () => {
		const skillMap = [50, 50, 50, 50] as OperatorSkillMap
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

	it('skill 100 is reachable via the generic skill update formula', () => {
		const maxAttempts = 200
		let skill = 90

		for (let i = 0; i < maxAttempts; i++) {
			skill = getUpdatedSkill(skill, true, 1, 0.9)
			if (skill >= 100) break
		}

		expect(
			skill,
			`could not reach 100 from 90 within ${maxAttempts} fast correct answers (stuck at ${skill})`
		).toBe(100)
	})

	it('all operators progress at similar rates from skill 0 to 50', () => {
		const targetSkill = 50
		const maxAttempts = 500
		const operators = [
			Operator.Addition,
			Operator.Subtraction,
			Operator.Multiplication,
			Operator.Division
		] as const

		const attemptCounts: number[] = []

		for (const op of operators) {
			let skill = 0
			let attempts = 0

			for (attempts = 0; attempts < maxAttempts; attempts++) {
				if (skill >= targetSkill) break
				// Simulate correct answer at difficulty matching current skill
				skill = getUpdatedSkill(skill, true, 2, 0.8)
			}

			expect(
				skill,
				`operator ${op}: could not reach ${targetSkill} within ${maxAttempts} attempts (stuck at ${skill})`
			).toBeGreaterThanOrEqual(targetSkill)
			attemptCounts.push(attempts)
		}

		const maxCount = Math.max(...attemptCounts)
		const minCount = Math.min(...attemptCounts)
		expect(
			maxCount / minCount,
			`progression parity: attempt counts ${attemptCounts.join(', ')} ratio ${(maxCount / minCount).toFixed(2)}`
		).toBeLessThan(2.0)
	})
})
