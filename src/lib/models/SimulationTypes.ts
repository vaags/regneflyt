import type { Operator, OperatorExtended } from '$lib/constants/Operator'
import type { AdaptiveSkillMap } from './AdaptiveProfile'
import type { Puzzle } from './Puzzle'
import type { adaptiveTuning } from './AdaptiveProfile'

export type CorrectnessMode = 'correct' | 'incorrect' | 'mixed'

export type SimulationConfig = {
	tuning: typeof adaptiveTuning
	startingSkills: AdaptiveSkillMap
	operator: OperatorExtended
	steps: number
	responseSpeed: number
	correctnessMode: CorrectnessMode
	mixedAccuracy: number
	seed: number
}

export type SimulationStep = {
	puzzle: Puzzle
	difficulty: number
	isCorrect: boolean
	durationSeconds: number
	skillBefore: number
	skillAfter: number
	operator: Operator
	allSkills: AdaptiveSkillMap
}
