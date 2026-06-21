import { OperatorExtended } from '$lib/constants/Operator'
import {
	adaptiveTuning,
	defaultAdaptiveSkillMap,
	type AdaptiveSkillMap
} from '$lib/models/AdaptiveProfile'
import type { OfflineAnalysisCorrectnessMode } from '$lib/models/OfflineAnalysisTypes'
import { runOfflineSimulation } from '$lib/helpers/analysis/offlineAnalysisRunner'
import { safeParse } from 'valibot'
import { adaptiveTuningSnapshotSchema } from '$lib/models/persistedSchemas'

export type OfflineAnalysisScenario = {
	title: string
	operator: OperatorExtended
	steps: number
	responseSpeed: number
	correctnessMode: OfflineAnalysisCorrectnessMode
	mixedAccuracy: number
	seed: number
	startingSkills: AdaptiveSkillMap
	tuning?: typeof adaptiveTuning
}

export type OfflineAnalysisPhase = 'early' | 'mid' | 'late'

export type OfflineAnalysisPhaseSummary = {
	steps: number
	correctCount: number
	incorrectCount: number
	meanSkillDelta: number
}

export type OfflineAnalysisPhaseMap = Record<
	OfflineAnalysisPhase,
	OfflineAnalysisPhaseSummary
>

export type OfflineAnalysisPhaseCoverageMap = Record<
	OfflineAnalysisPhase,
	number
>

const offlineAnalysisPhases: OfflineAnalysisPhase[] = ['early', 'mid', 'late']

export type OfflineAnalysisResult = {
	scenario: OfflineAnalysisScenario
	correctCount: number
	incorrectCount: number
	meanSkillDelta: number
	finalSkills: AdaptiveSkillMap
	steps: number
	phaseSummaries: OfflineAnalysisPhaseMap
}

export type OfflineAnalysisComparison = {
	baseline: OfflineAnalysisResult
	candidate: OfflineAnalysisResult
	delta: {
		correctCount: number
		incorrectCount: number
		meanSkillDelta: number
		finalSkills: AdaptiveSkillMap
	}
	phaseSummaries: {
		baseline: OfflineAnalysisPhaseMap
		candidate: OfflineAnalysisPhaseMap
	}
	phaseDelta: OfflineAnalysisPhaseMap
}

export type OfflineAnalysisVerdict = 'pass' | 'warn' | 'fail'

export type OfflineAnalysisEvidenceClass = 'compare' | 'matrix'

export type OfflineAnalysisChangeScope = 'narrow' | 'broad' | 'foundational'

export type OfflineAnalysisRecommendationPolicy = {
	evidenceClass: OfflineAnalysisEvidenceClass
	changeScope: OfflineAnalysisChangeScope
	broadChangePolicySatisfied: boolean
	advisoryOnly: boolean
}

export type OfflineAnalysisRecommendationReason =
	| 'favorable'
	| 'advisory_only'
	| 'aggregate_regression'
	| 'severe_phase_regression'
	| 'phase_warning'
	| 'operator_imbalance'

export type OfflineAnalysisSuppressedWarning = {
	kind: 'phase_warning'
	phase: OfflineAnalysisPhase
	reason: 'coverage_below_threshold'
}

export type OfflineAnalysisRecommendation = {
	verdict: OfflineAnalysisVerdict
	rationale: string
	caveat: string
	reason: OfflineAnalysisRecommendationReason
	policy: OfflineAnalysisRecommendationPolicy
	phaseWarnings: OfflineAnalysisPhase[]
	suppressedWarnings?: OfflineAnalysisSuppressedWarning[]
}

export type OfflineAnalysisRecommendationInput = {
	correctCountDelta: number
	meanSkillDelta: number
	operatorImbalance?: boolean
	evidenceClass?: OfflineAnalysisEvidenceClass
	changeScope?: OfflineAnalysisChangeScope
	reviewedStepCount?: number
	phaseDelta?: OfflineAnalysisPhaseMap
	phaseCoverage?: OfflineAnalysisPhaseCoverageMap
}

type OfflineAnalysisRecommendationInputPhaseMetadata =
	| {
			phaseDelta: OfflineAnalysisPhaseMap
			phaseCoverage: OfflineAnalysisPhaseCoverageMap
	  }
	| {
			phaseDelta?: undefined
			phaseCoverage?: undefined
	  }

export type StrictOfflineAnalysisRecommendationInput = Omit<
	OfflineAnalysisRecommendationInput,
	'phaseDelta' | 'phaseCoverage'
> &
	OfflineAnalysisRecommendationInputPhaseMetadata

const offlineAnalysisReviewCaveat =
	'This verdict is advisory. Foundational tuning changes still require matrix evidence and targeted e2e validation.'

const defaultReviewedStepCount = 100
const smallCorrectnessRegressionRateThreshold = 0.02
const severePhaseCorrectnessRegressionRateThreshold = 0.05
const severePhaseMeanSkillRegressionThreshold = 0.05
const minimumPhaseCoverageSteps = 20

function createEmptyPhaseMap(): OfflineAnalysisPhaseMap {
	return {
		early: {
			steps: 0,
			correctCount: 0,
			incorrectCount: 0,
			meanSkillDelta: 0
		},
		mid: {
			steps: 0,
			correctCount: 0,
			incorrectCount: 0,
			meanSkillDelta: 0
		},
		late: {
			steps: 0,
			correctCount: 0,
			incorrectCount: 0,
			meanSkillDelta: 0
		}
	}
}

function resolveOfflineAnalysisPhase(
	skillBefore: number,
	tuning: typeof adaptiveTuning
): OfflineAnalysisPhase {
	if (skillBefore < tuning.calibration.calibrationThreshold) {
		return 'early'
	}
	if (skillBefore < tuning.calibration.taperThreshold) {
		return 'mid'
	}
	return 'late'
}

function summarizeOfflineAnalysisPhases(
	simulationSteps: ReturnType<typeof runOfflineSimulation>,
	tuning: typeof adaptiveTuning
): OfflineAnalysisPhaseMap {
	const totals = createEmptyPhaseMap()
	const skillDeltaSums: Record<OfflineAnalysisPhase, number> = {
		early: 0,
		mid: 0,
		late: 0
	}

	for (const step of simulationSteps) {
		const phase = resolveOfflineAnalysisPhase(step.skillBefore, tuning)
		const summary = totals[phase]
		summary.steps += 1
		if (step.isCorrect) {
			summary.correctCount += 1
		} else {
			summary.incorrectCount += 1
		}
		skillDeltaSums[phase] += step.skillAfter - step.skillBefore
	}

	for (const phase of offlineAnalysisPhases) {
		const summary = totals[phase]
		summary.meanSkillDelta =
			summary.steps > 0 ? skillDeltaSums[phase] / summary.steps : 0
	}

	return totals
}

function comparePhaseSummaries(
	baseline: OfflineAnalysisPhaseMap,
	candidate: OfflineAnalysisPhaseMap
): OfflineAnalysisPhaseMap {
	const delta = createEmptyPhaseMap()

	for (const phase of offlineAnalysisPhases) {
		delta[phase] = {
			steps: candidate[phase].steps - baseline[phase].steps,
			correctCount:
				candidate[phase].correctCount - baseline[phase].correctCount,
			incorrectCount:
				candidate[phase].incorrectCount - baseline[phase].incorrectCount,
			meanSkillDelta:
				candidate[phase].meanSkillDelta - baseline[phase].meanSkillDelta
		}
	}

	return delta
}

function resolveReviewedStepCount(input: {
	reviewedStepCount?: number
}): number {
	if (
		typeof input.reviewedStepCount === 'number' &&
		Number.isFinite(input.reviewedStepCount)
	) {
		return Math.max(1, Math.floor(input.reviewedStepCount))
	}

	return defaultReviewedStepCount
}

function hasSufficientPhaseCoverage(
	phase: OfflineAnalysisPhase,
	phaseCoverage: OfflineAnalysisPhaseCoverageMap | undefined
): boolean {
	if (phaseCoverage === undefined) {
		return false
	}

	return phaseCoverage[phase] >= minimumPhaseCoverageSteps
}

function resolvePhaseCorrectnessRegressionRate(
	summary: OfflineAnalysisPhaseSummary,
	phase: OfflineAnalysisPhase,
	phaseCoverage: OfflineAnalysisPhaseCoverageMap | undefined
): number {
	const fallbackCoverage = Math.max(1, Math.abs(summary.steps))
	const rawCoverage = phaseCoverage?.[phase] ?? fallbackCoverage
	const reviewedPhaseCoverage = Math.max(1, rawCoverage)
	return summary.correctCount / reviewedPhaseCoverage
}

function classifyPhaseWarnings(
	phaseDelta: OfflineAnalysisPhaseMap | undefined,
	phaseCoverage: OfflineAnalysisPhaseCoverageMap | undefined
): OfflineAnalysisPhase[] {
	if (phaseDelta === undefined) {
		return []
	}

	return offlineAnalysisPhases.filter((phase) => {
		if (!hasSufficientPhaseCoverage(phase, phaseCoverage)) {
			return false
		}

		const summary = phaseDelta[phase]
		const correctnessRegressionRate = resolvePhaseCorrectnessRegressionRate(
			summary,
			phase,
			phaseCoverage
		)
		return correctnessRegressionRate < 0 || summary.meanSkillDelta < 0
	})
}

function classifySuppressedPhaseWarnings(
	phaseDelta: OfflineAnalysisPhaseMap | undefined,
	phaseCoverage: OfflineAnalysisPhaseCoverageMap | undefined
): OfflineAnalysisSuppressedWarning[] {
	if (phaseDelta === undefined || phaseCoverage === undefined) {
		return []
	}

	return offlineAnalysisPhases.flatMap((phase) => {
		if (hasSufficientPhaseCoverage(phase, phaseCoverage)) {
			return []
		}

		const summary = phaseDelta[phase]
		const correctnessRegressionRate = resolvePhaseCorrectnessRegressionRate(
			summary,
			phase,
			phaseCoverage
		)
		if (correctnessRegressionRate >= 0 && summary.meanSkillDelta >= 0) {
			return []
		}

		return [
			{
				kind: 'phase_warning' as const,
				phase,
				reason: 'coverage_below_threshold' as const
			}
		]
	})
}

function hasSeverePhaseRegression(
	phaseDelta: OfflineAnalysisPhaseMap | undefined,
	phaseCoverage: OfflineAnalysisPhaseCoverageMap | undefined
): boolean {
	if (phaseDelta === undefined) {
		return false
	}

	return offlineAnalysisPhases.some((phase) => {
		if (!hasSufficientPhaseCoverage(phase, phaseCoverage)) {
			return false
		}

		const summary = phaseDelta[phase]
		const correctnessRegressionRate = resolvePhaseCorrectnessRegressionRate(
			summary,
			phase,
			phaseCoverage
		)
		return (
			correctnessRegressionRate <=
				-severePhaseCorrectnessRegressionRateThreshold ||
			summary.meanSkillDelta <= -severePhaseMeanSkillRegressionThreshold
		)
	})
}

export function createOfflineAnalysisRecommendation(
	input: StrictOfflineAnalysisRecommendationInput
): OfflineAnalysisRecommendation {
	const hasPhaseDelta = input.phaseDelta !== undefined
	const hasPhaseCoverage = input.phaseCoverage !== undefined
	if (hasPhaseDelta !== hasPhaseCoverage) {
		throw new Error(
			'Offline analysis recommendation requires phaseDelta and phaseCoverage to be provided together.'
		)
	}

	const reviewedStepCount = resolveReviewedStepCount(input)
	const correctnessRegression = Math.max(0, -input.correctCountDelta)
	const correctnessRegressionRate = correctnessRegression / reviewedStepCount
	const progressionRegression = Math.max(0, -input.meanSkillDelta)
	const hasImbalance = input.operatorImbalance ?? false
	const evidenceClass = input.evidenceClass ?? 'compare'
	const changeScope = input.changeScope ?? 'narrow'
	const broadChangePolicySatisfied =
		changeScope === 'narrow' || evidenceClass === 'matrix'
	const advisoryOnly = !broadChangePolicySatisfied
	const phaseWarnings = classifyPhaseWarnings(
		input.phaseDelta,
		input.phaseCoverage
	)
	const suppressedWarnings = classifySuppressedPhaseWarnings(
		input.phaseDelta,
		input.phaseCoverage
	)
	const severePhaseRegression = hasSeverePhaseRegression(
		input.phaseDelta,
		input.phaseCoverage
	)
	const baseRecommendation = {
		caveat: offlineAnalysisReviewCaveat,
		policy: {
			evidenceClass,
			changeScope,
			broadChangePolicySatisfied,
			advisoryOnly
		},
		phaseWarnings,
		...(suppressedWarnings.length > 0 ? { suppressedWarnings } : {})
	} satisfies Pick<
		OfflineAnalysisRecommendation,
		'caveat' | 'policy' | 'phaseWarnings' | 'suppressedWarnings'
	>

	if (
		correctnessRegression === 0 &&
		progressionRegression === 0 &&
		!hasImbalance
	) {
		if (advisoryOnly) {
			return {
				verdict: 'warn',
				rationale:
					'Candidate looks favorable within the reviewed comparison, but broader tuning changes require matrix evidence before approval.',
				reason: 'advisory_only',
				...baseRecommendation
			}
		}

		if (severePhaseRegression) {
			return {
				verdict: 'fail',
				rationale:
					'Candidate improves aggregate metrics but regresses one or more progression phases beyond the review envelope.',
				reason: 'severe_phase_regression',
				...baseRecommendation
			}
		}

		if (phaseWarnings.length > 0) {
			return {
				verdict: 'warn',
				rationale:
					'Candidate looks favorable overall but regresses one or more progression phases that merit follow-up validation.',
				reason: 'phase_warning',
				...baseRecommendation
			}
		}

		return {
			verdict: 'pass',
			rationale:
				'Candidate holds or improves both correctness and progression within the reviewed scope.',
			reason: 'favorable',
			...baseRecommendation
		}
	}

	if (severePhaseRegression) {
		return {
			verdict: 'fail',
			rationale:
				'Candidate regresses one or more progression phases enough to outweigh the reviewed gains.',
			reason: 'severe_phase_regression',
			...baseRecommendation
		}
	}

	if (
		correctnessRegressionRate <= smallCorrectnessRegressionRateThreshold &&
		progressionRegression <= 0.1 &&
		!hasImbalance
	) {
		return {
			verdict: 'warn',
			rationale:
				'Candidate shows a small tradeoff that merits follow-up validation.',
			reason: 'aggregate_regression',
			...baseRecommendation
		}
	}

	return {
		verdict: 'fail',
		rationale:
			'Candidate regresses correctness, progression, or operator balance beyond the review envelope.',
		reason: hasImbalance ? 'operator_imbalance' : 'aggregate_regression',
		...baseRecommendation
	}
}

export function formatOfflineAnalysisRecommendation(
	recommendation: OfflineAnalysisRecommendation
): string {
	return [
		'Recommendation',
		`Verdict: ${recommendation.verdict}`,
		`Rationale: ${recommendation.rationale}`,
		`Caveat: ${recommendation.caveat}`,
		recommendation.phaseWarnings.length > 0
			? `Phase warnings: ${recommendation.phaseWarnings.join(', ')}`
			: undefined
	].join('\n')
}

export function loadTuningSnapshot(override: unknown): typeof adaptiveTuning {
	if (override === undefined) {
		return adaptiveTuning
	}
	const result = safeParse(adaptiveTuningSnapshotSchema, override)
	if (!result.success) {
		const firstIssue = result.issues.at(0)
		if (firstIssue === undefined) {
			throw new Error('Invalid tuning snapshot')
		}
		const path = firstIssue.path?.map((item) => String(item.key)).join('.')
		if (path !== undefined && path.length > 0) {
			throw new Error(
				`Invalid tuning snapshot at ${path}: ${firstIssue.message}`
			)
		}
		throw new Error(`Invalid tuning snapshot: ${firstIssue.message}`)
	}
	return result.output
}

export function createDefaultOfflineScenario(): OfflineAnalysisScenario {
	return {
		title: 'default-all-operators',
		operator: OperatorExtended.All,
		steps: 100,
		responseSpeed: 3,
		correctnessMode: 'mixed',
		mixedAccuracy: 0.7,
		seed: 1,
		startingSkills: [...defaultAdaptiveSkillMap] as AdaptiveSkillMap,
		tuning: adaptiveTuning
	}
}

export function runOfflineAnalysis(
	scenario: OfflineAnalysisScenario
): OfflineAnalysisResult {
	const simulationSteps = runOfflineSimulation({
		tuning: scenario.tuning ?? adaptiveTuning,
		startingSkills: scenario.startingSkills,
		operator: scenario.operator,
		steps: scenario.steps,
		responseSpeed: scenario.responseSpeed,
		correctnessMode: scenario.correctnessMode,
		mixedAccuracy: scenario.mixedAccuracy,
		seed: scenario.seed
	})

	const correctCount = simulationSteps.filter((step) => step.isCorrect).length
	const incorrectCount = simulationSteps.length - correctCount
	const meanSkillDelta =
		simulationSteps.length > 0
			? simulationSteps.reduce(
					(sum, step) => sum + (step.skillAfter - step.skillBefore),
					0
				) / simulationSteps.length
			: 0
	const phaseSummaries = summarizeOfflineAnalysisPhases(
		simulationSteps,
		scenario.tuning ?? adaptiveTuning
	)

	return {
		scenario,
		steps: simulationSteps.length,
		correctCount,
		incorrectCount,
		meanSkillDelta,
		phaseSummaries,
		finalSkills: simulationSteps.at(-1)?.allSkills ?? [
			...scenario.startingSkills
		]
	}
}

export function formatOfflineAnalysisReport(
	result: OfflineAnalysisResult
): string {
	return [
		`Scenario: ${result.scenario.title}`,
		`Seed: ${result.scenario.seed}`,
		`Steps: ${result.steps}`,
		`Correct: ${result.correctCount}`,
		`Incorrect: ${result.incorrectCount}`,
		`Mean skill delta: ${result.meanSkillDelta.toFixed(2)}`,
		`Final skills: ${result.finalSkills.join(', ')}`
	].join('\n')
}

export function compareOfflineAnalysisResults(
	baseline: OfflineAnalysisResult,
	candidate: OfflineAnalysisResult
): OfflineAnalysisComparison {
	return {
		baseline,
		candidate,
		delta: {
			correctCount: candidate.correctCount - baseline.correctCount,
			incorrectCount: candidate.incorrectCount - baseline.incorrectCount,
			meanSkillDelta: candidate.meanSkillDelta - baseline.meanSkillDelta,
			finalSkills: [
				candidate.finalSkills[0] - baseline.finalSkills[0],
				candidate.finalSkills[1] - baseline.finalSkills[1],
				candidate.finalSkills[2] - baseline.finalSkills[2],
				candidate.finalSkills[3] - baseline.finalSkills[3]
			] as AdaptiveSkillMap
		},
		phaseSummaries: {
			baseline: baseline.phaseSummaries,
			candidate: candidate.phaseSummaries
		},
		phaseDelta: comparePhaseSummaries(
			baseline.phaseSummaries,
			candidate.phaseSummaries
		)
	}
}

export function formatOfflineAnalysisComparison(
	comparison: OfflineAnalysisComparison
): string {
	return [
		`Baseline: ${comparison.baseline.scenario.title}`,
		`Candidate: ${comparison.candidate.scenario.title}`,
		`Correct count delta: ${comparison.delta.correctCount}`,
		`Incorrect count delta: ${comparison.delta.incorrectCount}`,
		`Mean skill delta: ${comparison.delta.meanSkillDelta.toFixed(2)}`,
		`Final skills delta: ${comparison.delta.finalSkills.join(', ')}`
	].join('\n')
}
