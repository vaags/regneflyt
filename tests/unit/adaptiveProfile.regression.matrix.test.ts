import { describe, expect, it } from 'vitest'
import { getUpdatedSkill } from '$lib/helpers/adaptiveHelper'

describe('adaptiveProfile golden regressions: matrix', () => {
	it('golden representative matrix remains stable', () => {
		const cases = [
			{
				skill: 0,
				isCorrect: true,
				durationSeconds: 0,
				difficultyRatio: 0.39,
				consecutiveCorrect: 0,
				expectedDelta: 0
			},
			{
				skill: 0,
				isCorrect: true,
				durationSeconds: 0,
				difficultyRatio: 0.4,
				consecutiveCorrect: 0,
				expectedDelta: 1
			},
			{
				skill: 0,
				isCorrect: true,
				durationSeconds: 0,
				difficultyRatio: 1,
				consecutiveCorrect: 8,
				expectedDelta: 3
			},
			{
				skill: 40,
				isCorrect: false,
				durationSeconds: 6,
				difficultyRatio: 1,
				consecutiveCorrect: 0,
				expectedDelta: -5
			},
			{
				skill: 40,
				isCorrect: true,
				durationSeconds: 0,
				difficultyRatio: 1,
				consecutiveCorrect: 8,
				expectedDelta: 5
			},
			{
				skill: 60,
				isCorrect: false,
				durationSeconds: 4,
				difficultyRatio: 1,
				consecutiveCorrect: 0,
				expectedDelta: -4
			},
			{
				skill: 60,
				isCorrect: true,
				durationSeconds: 2,
				difficultyRatio: 0.75,
				consecutiveCorrect: 8,
				expectedDelta: 3
			},
			{
				skill: 80,
				isCorrect: false,
				durationSeconds: 8,
				difficultyRatio: 1,
				consecutiveCorrect: 0,
				expectedDelta: -5
			},
			{
				skill: 80,
				isCorrect: true,
				durationSeconds: 0,
				difficultyRatio: 1,
				consecutiveCorrect: 8,
				expectedDelta: 3
			},
			{
				skill: 80,
				isCorrect: true,
				durationSeconds: 6,
				difficultyRatio: 1,
				consecutiveCorrect: 0,
				expectedDelta: 1
			}
		]

		for (const testCase of cases) {
			const updatedSkill = getUpdatedSkill(
				testCase.skill,
				testCase.isCorrect,
				testCase.durationSeconds,
				testCase.difficultyRatio,
				testCase.consecutiveCorrect
			)
			expect(updatedSkill - testCase.skill).toBe(testCase.expectedDelta)
		}
	})
})
