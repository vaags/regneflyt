import { describe, expect, it } from 'vitest'
import { createRng, nextInt } from '$lib/helpers/rng'
import { getUpdatedSkill } from '$lib/helpers/adaptiveHelper'
import {
	runTrajectory,
	type TrajectoryStep
} from './adaptiveProfile.regression.helpers'

describe('adaptiveProfile golden regressions: trajectories', () => {
	it('golden low skill deterministic trajectory remains stable', () => {
		const steps: TrajectoryStep[] = [
			{ isCorrect: true, durationSeconds: 3, difficultyRatio: 1 },
			{ isCorrect: true, durationSeconds: 4, difficultyRatio: 0.8 },
			{ isCorrect: false, durationSeconds: 5, difficultyRatio: 0.8 },
			{ isCorrect: true, durationSeconds: 2, difficultyRatio: 0.9 },
			{ isCorrect: true, durationSeconds: 1, difficultyRatio: 1 },
			{ isCorrect: false, durationSeconds: 6, difficultyRatio: 0.7 },
			{ isCorrect: true, durationSeconds: 3, difficultyRatio: 0.7 },
			{ isCorrect: true, durationSeconds: 2, difficultyRatio: 0.9 },
			{ isCorrect: true, durationSeconds: 2, difficultyRatio: 1 },
			{ isCorrect: false, durationSeconds: 4, difficultyRatio: 0.8 }
		]

		const progression = runTrajectory(12, steps)
		expect(progression.map((step) => step.delta)).toEqual([
			2, 1, -5, 2, 3, -5, 1, 2, 2, -4
		])
		expect(progression.at(-1)?.skillAfter).toBe(11)
	})

	it('golden mid skill deterministic trajectory remains stable', () => {
		const steps: TrajectoryStep[] = [
			{ isCorrect: true, durationSeconds: 3, difficultyRatio: 0.9 },
			{ isCorrect: true, durationSeconds: 2, difficultyRatio: 1 },
			{ isCorrect: true, durationSeconds: 2, difficultyRatio: 1 },
			{ isCorrect: true, durationSeconds: 2, difficultyRatio: 1 },
			{ isCorrect: true, durationSeconds: 2, difficultyRatio: 1 },
			{ isCorrect: true, durationSeconds: 2, difficultyRatio: 1 },
			{ isCorrect: true, durationSeconds: 2, difficultyRatio: 1 },
			{ isCorrect: true, durationSeconds: 2, difficultyRatio: 1 },
			{ isCorrect: false, durationSeconds: 5, difficultyRatio: 0.8 },
			{ isCorrect: true, durationSeconds: 3, difficultyRatio: 0.95 }
		]

		const progression = runTrajectory(50, steps)
		expect(progression.map((step) => step.delta)).toEqual([
			2, 3, 3, 3, 3, 3, 3, 3, -4, 2
		])
		expect(progression.at(-1)?.skillAfter).toBe(71)
	})

	it('golden high skill deterministic trajectory remains stable', () => {
		const steps: TrajectoryStep[] = [
			{ isCorrect: true, durationSeconds: 3, difficultyRatio: 1 },
			{ isCorrect: true, durationSeconds: 4, difficultyRatio: 1 },
			{ isCorrect: true, durationSeconds: 5, difficultyRatio: 0.95 },
			{ isCorrect: false, durationSeconds: 7, difficultyRatio: 0.9 },
			{ isCorrect: true, durationSeconds: 2, difficultyRatio: 1 },
			{ isCorrect: true, durationSeconds: 3, difficultyRatio: 1 },
			{ isCorrect: true, durationSeconds: 2, difficultyRatio: 1 },
			{ isCorrect: true, durationSeconds: 2, difficultyRatio: 1 },
			{ isCorrect: true, durationSeconds: 2, difficultyRatio: 1 },
			{ isCorrect: true, durationSeconds: 2, difficultyRatio: 1 }
		]

		const progression = runTrajectory(82, steps)
		expect(progression.map((step) => step.delta)).toEqual([
			2, 1, 1, -4, 2, 1, 2, 2, 1, 1
		])
		expect(progression.at(-1)?.skillAfter).toBe(91)
	})

	it('golden seeded mixed trajectory remains stable', () => {
		const { rng } = createRng(42_424)
		let skill = 45
		let streak = 0
		const progression: Array<{
			index: number
			skillBefore: number
			skillAfter: number
			delta: number
			streak: number
			isCorrect: boolean
			durationSeconds: number
			difficultyRatio: number
		}> = []

		for (let index = 0; index < 20; index++) {
			const isCorrect = nextInt(rng, 0, 99) < 78
			const durationSeconds = isCorrect
				? nextInt(rng, 1, 7)
				: nextInt(rng, 2, 9)
			const difficultyRatio = nextInt(rng, 40, 100) / 100
			streak = isCorrect ? streak + 1 : 0
			const nextSkill = getUpdatedSkill(
				skill,
				isCorrect,
				durationSeconds,
				difficultyRatio,
				streak
			)

			progression.push({
				index,
				skillBefore: skill,
				skillAfter: nextSkill,
				delta: nextSkill - skill,
				streak,
				isCorrect,
				durationSeconds,
				difficultyRatio
			})

			skill = nextSkill
		}

		expect(progression.map((step) => step.delta)).toEqual([
			1, 1, 2, -4, -5, 1, -4, 2, 1, 2, 1, -5, 2, 0, 2, -5, 0, -4, 1, 2
		])
		expect(progression.at(-1)?.skillAfter).toBe(36)
	})
})
