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

type OfflineAnalysisRecommendationPhaseCoverageMap = Partial<
	Record<OfflineAnalysisPhase, number>
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

/** Verdict classification: whether change is expected or unexpected */
export type OfflineAnalysisVerdictKind = 'change_detected' | 'issue_detected'

/** Verdict severity: how seriously to treat the finding */
export type OfflineAnalysisVerdictSeverity = 'info' | 'warn' | 'critical'

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
	| 'phase_acceleration_expected'
	| 'operator_imbalance_contextual'

/** Signal that phase transition was accelerated with improved efficiency */
export type OfflineAnalysisPhaseAccelerationSignal = {
	acceleratedPhase: OfflineAnalysisPhase
	stepDelta: number
	skillGainDeltaAbsolute: number
	skillGainDeltaPercent?: number
	laterPhasesImprove: boolean
}

/** Operator-level breakdown of correctness and skill deltas */
export type OfflineAnalysisOperatorBreakdown = {
	individual: Array<{
		operator: string
		verdict: 'good' | 'neutral' | 'concerning'
		meanSkillDelta: number
		correctDelta: number
	}>
	mixed: {
		verdict: 'good' | 'neutral' | 'imbalanced'
		meanSkillDelta: number
		correctDelta: number
		note?: string
	}
}

export type OfflineAnalysisSuppressedWarning = {
	kind: 'phase_warning'
	phase: OfflineAnalysisPhase
	reason: 'coverage_below_threshold'
}

export type OfflineAnalysisRecommendation = {
	kind: OfflineAnalysisVerdictKind
	severity: OfflineAnalysisVerdictSeverity
	verdict: OfflineAnalysisVerdict
	rationale: string
	caveat: string
	reason: OfflineAnalysisRecommendationReason
	policy: OfflineAnalysisRecommendationPolicy
	phaseWarnings: OfflineAnalysisPhase[]
	suppressedWarnings?: OfflineAnalysisSuppressedWarning[]
	phaseAccelerationSignal?: OfflineAnalysisPhaseAccelerationSignal
	operatorBreakdown?: OfflineAnalysisOperatorBreakdown
}

export type OfflineAnalysisRecommendationInput = {
	correctCountDelta: number
	meanSkillDelta: number
	operatorImbalance?: boolean
	evidenceClass?: OfflineAnalysisEvidenceClass
	changeScope?: OfflineAnalysisChangeScope
	reviewedStepCount?: number
	phaseDelta?: OfflineAnalysisPhaseMap
	phaseCoverage?: OfflineAnalysisRecommendationPhaseCoverageMap
	phaseEfficiencyBaseline?: Partial<Record<OfflineAnalysisPhase, number>>
	operatorBreakdown?: {
		individual: Array<{
			operator: string
			verdict: 'good' | 'neutral' | 'concerning'
			meanSkillDelta: number
			correctDelta: number
		}>
		mixed: {
			verdict: 'good' | 'neutral' | 'imbalanced'
			meanSkillDelta: number
			correctDelta: number
			note?: string
		}
	}
}

type OfflineAnalysisRecommendationInputPhaseMetadata =
	| {
			phaseDelta: OfflineAnalysisPhaseMap
			phaseCoverage: OfflineAnalysisRecommendationPhaseCoverageMap
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
const laterPhaseSkillRegressionNoiseFloor = -0.05
const laterPhaseCorrectnessRegressionRateThreshold = 0.02
const fallbackLaterPhaseCorrectnessDeltaThreshold = -1
const minimumEfficiencyBaselineMagnitude = 0.001

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
	phaseCoverage: OfflineAnalysisRecommendationPhaseCoverageMap | undefined
): boolean {
	if (phaseCoverage === undefined) {
		return false
	}

	const coverage = phaseCoverage[phase]
	return coverage !== undefined && coverage >= minimumPhaseCoverageSteps
}

function resolvePhaseCorrectnessRegressionRate(
	summary: OfflineAnalysisPhaseSummary,
	phase: OfflineAnalysisPhase,
	phaseCoverage: OfflineAnalysisRecommendationPhaseCoverageMap | undefined
): number {
	const fallbackCoverage = Math.max(1, Math.abs(summary.steps))
	const rawCoverage = phaseCoverage?.[phase] ?? fallbackCoverage
	const reviewedPhaseCoverage = Math.max(1, rawCoverage)
	return summary.correctCount / reviewedPhaseCoverage
}

function classifyPhaseWarnings(
	phaseDelta: OfflineAnalysisPhaseMap | undefined,
	phaseCoverage: OfflineAnalysisRecommendationPhaseCoverageMap | undefined
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
	phaseCoverage: OfflineAnalysisRecommendationPhaseCoverageMap | undefined
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

/**
 * Detects if the phase-level regression pattern indicates phase acceleration
 * (earlier progression through earlier phase) with improved efficiency,
 * rather than a true regression in learning ability.
 *
 * Compression is indicated when:
 * - Earlier phase has fewer steps (earlier exit from phase)
 * - Earlier phase has higher skill gain per answer (better efficiency)
 * - Later phases don't regress (mid/late phases stable or improve)
 * - Aggregate correctness is non-negative (not worse overall)
 */
function isPhaseCompressionPattern(
	phaseDelta: OfflineAnalysisPhaseMap | undefined,
	phaseCoverage: OfflineAnalysisRecommendationPhaseCoverageMap | undefined,
	correctCountDelta: number
): { detected: boolean; phase?: OfflineAnalysisPhase } {
	if (phaseDelta === undefined) {
		return { detected: false }
	}

	for (const phase of offlineAnalysisPhases) {
		if (!hasSufficientPhaseCoverage(phase, phaseCoverage)) {
			continue
		}

		const summary = phaseDelta[phase]
		const hasFewerSteps = summary.steps < 0
		const hasHigherEfficiency = summary.meanSkillDelta > 0
		const aggregateNotWorse = correctCountDelta >= 0

		if (hasFewerSteps && hasHigherEfficiency && aggregateNotWorse) {
			return { detected: true, phase }
		}
	}

	return { detected: false }
}

/**
 * Check if later phases (after the given phase) improve or hold steady.
 * Used to validate that phase compression doesn't harm downstream progression.
 */
function doLaterPhasesImprove(
	phaseDelta: OfflineAnalysisPhaseMap | undefined,
	phase: OfflineAnalysisPhase,
	phaseCoverage: OfflineAnalysisRecommendationPhaseCoverageMap | undefined
): boolean {
	if (phaseDelta === undefined) {
		return false
	}

	const laterPhases =
		phase === 'early' ? (['mid', 'late'] as const) : (['late'] as const)

	return laterPhases.every((p) => {
		const summary = phaseDelta[p]
		const skillDeltaAcceptable =
			summary.meanSkillDelta >= laterPhaseSkillRegressionNoiseFloor

		const correctnessRegressionRate = resolvePhaseCorrectnessRegressionRate(
			summary,
			p,
			phaseCoverage
		)
		const hasCoverageSignal = phaseCoverage?.[p] !== undefined
		const correctnessRateAcceptable =
			correctnessRegressionRate >= -laterPhaseCorrectnessRegressionRateThreshold
		const correctnessAbsoluteFallbackAcceptable =
			summary.correctCount >= fallbackLaterPhaseCorrectnessDeltaThreshold
		const correctnessNotWorse = hasCoverageSignal
			? correctnessRateAcceptable
			: correctnessAbsoluteFallbackAcceptable

		return skillDeltaAcceptable && correctnessNotWorse
	})
}

function hasSeverePhaseRegression(
	phaseDelta: OfflineAnalysisPhaseMap | undefined,
	phaseCoverage: OfflineAnalysisRecommendationPhaseCoverageMap | undefined
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

	// Check for phase compression pattern (expected improvement, not true regression)
	const compressionPattern = isPhaseCompressionPattern(
		input.phaseDelta,
		input.phaseCoverage,
		input.correctCountDelta
	)
	const isCompression =
		compressionPattern.detected &&
		compressionPattern.phase !== undefined &&
		doLaterPhasesImprove(
			input.phaseDelta,
			compressionPattern.phase,
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

	// Phase compression pattern detected: Expected improvement, not a problem
	if (isCompression && compressionPattern.phase) {
		const phase = compressionPattern.phase
		const phaseDelta = input.phaseDelta?.[phase]
		if (!phaseDelta) {
			throw new Error(`Phase delta missing for accelerated phase: ${phase}`)
		}

		const skillGainDeltaAbsolute = Number(phaseDelta.meanSkillDelta.toFixed(4))
		const efficiencyBaseline = input.phaseEfficiencyBaseline?.[phase]
		const hasMeaningfulBaseline =
			typeof efficiencyBaseline === 'number' &&
			Number.isFinite(efficiencyBaseline) &&
			Math.abs(efficiencyBaseline) >= minimumEfficiencyBaselineMagnitude
		const skillGainDeltaPercent = hasMeaningfulBaseline
			? Math.round(
					(skillGainDeltaAbsolute / Math.abs(efficiencyBaseline)) * 100
				)
			: undefined
		const efficiencySummary =
			skillGainDeltaPercent !== undefined
				? `+${skillGainDeltaPercent}% skill gain per answer`
				: `${skillGainDeltaAbsolute >= 0 ? '+' : ''}${skillGainDeltaAbsolute.toFixed(4)} skill gain per answer`

		// For broad/foundational changes, require matrix evidence even if acceleration is detected
		if (advisoryOnly) {
			return {
				kind: 'change_detected',
				severity: 'warn',
				verdict: 'warn',
				rationale: `Phase transition would accelerate (${Math.abs(phaseDelta.steps).toFixed(1)} fewer ${phase} phase steps) with improved efficiency (${efficiencySummary}), but broader tuning changes require matrix evidence before approval.`,
				reason: 'advisory_only',
				...baseRecommendation
			}
		}

		return {
			kind: 'change_detected',
			severity: 'info',
			verdict: 'pass',
			rationale: `Phase transition accelerated (${Math.abs(phaseDelta.steps).toFixed(1)} fewer ${phase} phase steps) with improved efficiency (${efficiencySummary}). Later phases improve, indicating downstream benefits.`,
			reason: 'phase_acceleration_expected',
			phaseAccelerationSignal: {
				acceleratedPhase: phase,
				stepDelta: phaseDelta.steps,
				skillGainDeltaAbsolute,
				...(skillGainDeltaPercent !== undefined
					? { skillGainDeltaPercent }
					: {}),
				laterPhasesImprove: true
			},
			...baseRecommendation
		}
	}

	if (
		correctnessRegression === 0 &&
		progressionRegression === 0 &&
		!hasImbalance
	) {
		if (advisoryOnly) {
			return {
				kind: 'change_detected',
				severity: 'warn',
				verdict: 'warn',
				rationale:
					'Candidate looks favorable within the reviewed comparison, but broader tuning changes require matrix evidence before approval.',
				reason: 'advisory_only',
				...baseRecommendation
			}
		}

		if (severePhaseRegression) {
			return {
				kind: 'issue_detected',
				severity: 'critical',
				verdict: 'fail',
				rationale:
					'Candidate improves aggregate metrics but regresses one or more progression phases beyond the review envelope.',
				reason: 'severe_phase_regression',
				...(input.operatorBreakdown !== undefined
					? { operatorBreakdown: input.operatorBreakdown }
					: {}),
				...baseRecommendation
			}
		}

		if (phaseWarnings.length > 0) {
			return {
				kind: 'change_detected',
				severity: 'warn',
				verdict: 'warn',
				rationale:
					'Candidate looks favorable overall but regresses one or more progression phases that merit follow-up validation.',
				reason: 'phase_warning',
				...(input.operatorBreakdown !== undefined
					? { operatorBreakdown: input.operatorBreakdown }
					: {}),
				...baseRecommendation
			}
		}

		return {
			kind: 'change_detected',
			severity: 'info',
			verdict: 'pass',
			rationale:
				'Candidate holds or improves both correctness and progression within the reviewed scope.',
			reason: 'favorable',
			...(input.operatorBreakdown !== undefined
				? { operatorBreakdown: input.operatorBreakdown }
				: {}),
			...baseRecommendation
		}
	}

	if (severePhaseRegression && !isCompression) {
		return {
			kind: 'issue_detected',
			severity: 'critical',
			verdict: 'fail',
			rationale:
				'Candidate regresses one or more progression phases enough to outweigh the reviewed gains.',
			reason: 'severe_phase_regression',
			...(input.operatorBreakdown !== undefined
				? { operatorBreakdown: input.operatorBreakdown }
				: {}),
			...baseRecommendation
		}
	}

	if (
		correctnessRegressionRate <= smallCorrectnessRegressionRateThreshold &&
		progressionRegression <= 0.1 &&
		!hasImbalance
	) {
		return {
			kind: 'change_detected',
			severity: 'warn',
			verdict: 'warn',
			rationale:
				'Candidate shows a small tradeoff that merits follow-up validation.',
			reason: 'aggregate_regression',
			...(input.operatorBreakdown !== undefined
				? { operatorBreakdown: input.operatorBreakdown }
				: {}),
			...baseRecommendation
		}
	}

	const failReason = hasImbalance
		? 'operator_imbalance'
		: 'aggregate_regression'
	return {
		kind: 'issue_detected',
		severity: hasImbalance ? 'warn' : 'critical',
		verdict: 'fail',
		rationale:
			'Candidate regresses correctness, progression, or operator balance beyond the review envelope.',
		reason: failReason,
		...(input.operatorBreakdown !== undefined
			? { operatorBreakdown: input.operatorBreakdown }
			: {}),
		...baseRecommendation
	}
}

export function formatOfflineAnalysisRecommendation(
	recommendation: OfflineAnalysisRecommendation
): string {
	const lines = ['Recommendation']

	// Format verdict with kind + severity for clarity
	lines.push(`Verdict: ${recommendation.verdict}`)
	lines.push(
		`Kind: ${recommendation.kind}, Severity: ${recommendation.severity}`
	)

	lines.push(`Rationale: ${recommendation.rationale}`)
	lines.push(`Caveat: ${recommendation.caveat}`)

	// Include phase acceleration signal if present
	if (recommendation.phaseAccelerationSignal) {
		const sig = recommendation.phaseAccelerationSignal
		lines.push('')
		lines.push('Phase Acceleration Signal:')
		lines.push(
			`  Phase: ${sig.acceleratedPhase}, Step Delta: ${sig.stepDelta.toFixed(2)}`
		)
		if (sig.skillGainDeltaPercent !== undefined) {
			lines.push(`  Skill Gain Improvement: +${sig.skillGainDeltaPercent}%`)
		}
		lines.push(
			`  Absolute Skill Gain Delta: ${sig.skillGainDeltaAbsolute >= 0 ? '+' : ''}${sig.skillGainDeltaAbsolute.toFixed(4)}`
		)
		lines.push(`  Later Phases Improve: ${sig.laterPhasesImprove}`)
	}

	// Include operator breakdown if present
	if (recommendation.operatorBreakdown) {
		lines.push('')
		lines.push('Operator Breakdown:')
		for (const op of recommendation.operatorBreakdown.individual) {
			lines.push(
				`  ${op.operator}: verdict=${op.verdict}, skillDelta=${op.meanSkillDelta.toFixed(4)}, correct=${op.correctDelta.toFixed(2)}`
			)
		}
		const mixed = recommendation.operatorBreakdown.mixed
		lines.push(
			`  all (mixed): verdict=${mixed.verdict}, skillDelta=${mixed.meanSkillDelta.toFixed(4)}, correct=${mixed.correctDelta.toFixed(2)}`
		)
		if (mixed.note !== undefined) {
			lines.push(`  Note: ${mixed.note}`)
		}
	}

	if (recommendation.phaseWarnings.length > 0) {
		lines.push(`Phase warnings: ${recommendation.phaseWarnings.join(', ')}`)
	}

	return lines.join('\n')
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
