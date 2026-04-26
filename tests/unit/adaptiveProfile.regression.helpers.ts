import { getUpdatedSkill } from '$lib/helpers/adaptiveHelper'
import { adaptiveTuning } from '$lib/models/AdaptiveProfile'

export type TrajectoryStep = {
	isCorrect: boolean
	durationSeconds: number
	difficultyRatio: number
}

export type ProgressionStep = {
	index: number
	skillBefore: number
	skillAfter: number
	delta: number
	streak: number
	isCorrect: boolean
	durationSeconds: number
	difficultyRatio: number
}

export function getEffectiveMaxDuration(skill: number): number {
	return (
		adaptiveTuning.maxDurationSeconds +
		(adaptiveTuning.maxDurationSecondsAtMaxSkill -
			adaptiveTuning.maxDurationSeconds) *
			(skill / adaptiveTuning.maxSkill)
	)
}

export function runTrajectory(
	startSkill: number,
	steps: TrajectoryStep[]
): ProgressionStep[] {
	let skill = startSkill
	let streak = 0
	const progression: ProgressionStep[] = []

	for (const [index, step] of steps.entries()) {
		streak = step.isCorrect ? streak + 1 : 0
		const nextSkill = getUpdatedSkill(
			skill,
			step.isCorrect,
			step.durationSeconds,
			step.difficultyRatio,
			streak
		)
		progression.push({
			index,
			skillBefore: skill,
			skillAfter: nextSkill,
			delta: nextSkill - skill,
			streak,
			isCorrect: step.isCorrect,
			durationSeconds: step.durationSeconds,
			difficultyRatio: step.difficultyRatio
		})
		skill = nextSkill
	}

	return progression
}
