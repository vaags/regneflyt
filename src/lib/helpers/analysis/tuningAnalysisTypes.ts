import type { adaptiveTuning } from '#lib/domain/skill-progression/adaptiveTuning.ts'
import type { OperatorSkillMap } from '#lib/domain/skill-progression/skillModel.ts'

export const tuningAnalysisOperators = [
	'addition',
	'subtraction',
	'multiplication',
	'division',
	'all'
] as const

export type TuningAnalysisOperatorName =
	(typeof tuningAnalysisOperators)[number]
export type TuningAnalysisConfig = {
	seeds: number[]
	operators: TuningAnalysisOperatorName[]
	steps: number
	accuracy: number
	responseSeconds: number
	startingSkills: OperatorSkillMap
}

export type Phase = 'early' | 'mid' | 'late'
export type DedicatedOperatorName = Exclude<TuningAnalysisOperatorName, 'all'>
export type RateSummary = {
	totalCount: number
	totalEligibleCount: number
	rate: number | null
}
export type CompositionSummary = {
	normalMode: RateSummary
	alternateMode: RateSummary
	randomMode: RateSummary
	unknownOperand: RateSummary
	negativeSubtraction: RateSummary
	unknownDivisor: RateSummary
	carryOrBorrow: RateSummary
}
export type CompositionDelta = {
	normalMode: number | null
	alternateMode: number | null
	randomMode: number | null
	unknownOperand: number | null
	negativeSubtraction: number | null
	unknownDivisor: number | null
	carryOrBorrow: number | null
}
export type StepMetrics = {
	totalSteps: number
	totalCorrectAnswers: number
	totalIncorrectAnswers: number
	totalSkillChange: number
	netSkillChangePerPuzzle: number
	meanCorrectGain: number
	meanIncorrectPenalty: number
	meanDifficulty: number
	meanDifficultyRatio: number
	totalBlockedGains: number
	blockedGainRate: number
	totalCeilingClampedGains: number
	ceilingClampedGainRate: number
	totalFloorClampedPenalties: number
	floorClampedPenaltyRate: number
	totalCooldownPuzzles: number
	meanCooldownDifficulty: number
}
export type StepSummary = StepMetrics & {
	composition: CompositionSummary
}
export type StepDelta = StepMetrics & {
	composition: CompositionDelta
}
export type RunSummary = StepSummary & {
	seed: number
	answerSeed: number
	operator: TuningAnalysisOperatorName
	finalSkills: OperatorSkillMap
	phases: Record<Phase, StepSummary>
	allModeOperators?: AllModeOperatorSummary[]
}
export type RangeMetric = { mean: number; min: number; max: number }
export type DedicatedOperatorSummary = StepSummary & {
	operator: DedicatedOperatorName
	runs: number
	startingSkill: number
	finalSkill: number
	finalSkillRange: RangeMetric
	phases: Record<Phase, StepSummary>
}
export type AllModeOperatorSummary = StepSummary & {
	operator: DedicatedOperatorName
	selectionShare: number
	startingSkill: number
	finalSkill: number
}
export type AllModeSummary = StepSummary & {
	runs: number
	startingSkills: OperatorSkillMap
	finalSkills: OperatorSkillMap
	meanFinalSkill: number
	phases: Record<Phase, StepSummary>
	operators: AllModeOperatorSummary[]
	seedRange: {
		meanFinalSkill: RangeMetric
		meanDifficulty: RangeMetric
		blockedGainRate: RangeMetric
	}
}
export type AnalysisSummary = {
	dedicated: DedicatedOperatorSummary[]
	allOperator?: AllModeSummary
}
export type DedicatedOperatorDelta = StepDelta & {
	operator: DedicatedOperatorName
	finalSkill: number
	phases: Record<Phase, StepDelta>
}
export type AllModeOperatorDelta = StepDelta & {
	operator: DedicatedOperatorName
	selectionShare: number
	finalSkill: number
}
export type AllModeDelta = StepDelta & {
	finalSkills: OperatorSkillMap
	meanFinalSkill: number
	phases: Record<Phase, StepDelta>
	operators: AllModeOperatorDelta[]
}
export type AnalysisDelta = {
	dedicated: DedicatedOperatorDelta[]
	allOperator?: AllModeDelta
}
export type PhaseThresholds = { calibration: number; taper: number }
export type TuningLeafValue = number | number[]
export type TuningChange = {
	path: string
	baseline: TuningLeafValue
	candidate: TuningLeafValue
}
export type ArtifactBase = {
	schemaVersion: 2
	generatedAt: string
	elapsedMs: number
	config: TuningAnalysisConfig & { phaseThresholds: PhaseThresholds }
	inputs: { tuning?: string; baseline?: string; candidate?: string }
}
export type StandaloneArtifact = ArtifactBase & {
	mode: 'standalone'
	tunings: { standalone: typeof adaptiveTuning }
	runs: RunSummary[]
	summary: AnalysisSummary
}
export type ComparisonRun = {
	seed: number
	operator: TuningAnalysisOperatorName
	baseline: RunSummary
	candidate: RunSummary
}
export type ComparisonArtifact = ArtifactBase & {
	mode: 'comparison'
	tunings: {
		baseline: typeof adaptiveTuning
		candidate: typeof adaptiveTuning
	}
	tuningChanges: TuningChange[]
	runs: ComparisonRun[]
	summary: {
		baseline: AnalysisSummary
		candidate: AnalysisSummary
		delta: AnalysisDelta
	}
}
export type TuningAnalysisArtifact = StandaloneArtifact | ComparisonArtifact
