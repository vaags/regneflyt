import type {
	Operator,
	OperatorExtended
} from '#lib/domain/arithmetic/operator.ts'
import type {
	OperatorSkillMap,
	OperatorWeights
} from '#lib/domain/skill-progression/skillModel.ts'
import type { Puzzle } from '#lib/domain/puzzle-generation/puzzle.ts'
import type { adaptiveTuning } from '#lib/domain/skill-progression/adaptiveTuning.ts'
import type { SkillUpdateBreakdown } from '#lib/domain/skill-progression/skillUpdate.ts'

export const offlineAnalysisPhases = ['early', 'mid', 'late'] as const

export type OfflineAnalysisPhase = (typeof offlineAnalysisPhases)[number]

export const offlineAnalysisPhaseLabels = {
	early: 'Early',
	mid: 'Mid',
	late: 'Late'
} satisfies Record<OfflineAnalysisPhase, string>

export function mapOfflineAnalysisPhases<T>(
	create: (phase: OfflineAnalysisPhase) => T
): Record<OfflineAnalysisPhase, T> {
	return {
		early: create('early'),
		mid: create('mid'),
		late: create('late')
	} satisfies Record<OfflineAnalysisPhase, T>
}

export type OfflineAnalysisCorrectnessMode = 'correct' | 'incorrect' | 'mixed'

export type OfflineAnalysisConfig = {
	tuning: typeof adaptiveTuning
	startingSkills: OperatorSkillMap
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
	allSkills: OperatorSkillMap
	breakdown: SkillUpdateBreakdown
	consecutiveCorrect: number
	operatorWeights?: OperatorWeights
}
