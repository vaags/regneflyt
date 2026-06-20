import type { Operator, OperatorExtended } from '$lib/constants/Operator'
import type { AdaptiveSkillMap, OperatorWeights } from './AdaptiveProfile'
import type { Puzzle } from './Puzzle'
import type { adaptiveTuning } from './AdaptiveProfile'
import type { SkillUpdateBreakdown } from '$lib/helpers/adaptiveSkillUpdate'

export type OfflineAnalysisCorrectnessMode = 'correct' | 'incorrect' | 'mixed'

export type OfflineAnalysisConfig = {
	tuning: typeof adaptiveTuning
	startingSkills: AdaptiveSkillMap
	operator: OperatorExtended
	steps: number
	responseSpeed: number
	correctnessMode: OfflineAnalysisCorrectnessMode
	mixedAccuracy: number
	seed: number
}

export type OfflineAnalysisStep = {
	puzzle: Puzzle
	difficulty: number
	isCorrect: boolean
	durationSeconds: number
	skillBefore: number
	skillAfter: number
	operator: Operator
	allSkills: AdaptiveSkillMap
	breakdown: SkillUpdateBreakdown
	consecutiveCorrect: number
	operatorWeights?: OperatorWeights
}
