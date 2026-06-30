import type {
	OfflineAnalysisPhaseCoverageMap,
	OfflineAnalysisPhaseMap
} from '$lib/helpers/analysis/offlineAnalysisHelper'
import {
	offlineAnalysisPhases,
	type OfflineAnalysisPhase
} from '$lib/models/OfflineAnalysisTypes'

export type OfflineAnalysisEvidenceClass = 'compare' | 'matrix'

export type OfflineAnalysisChangeScope = 'narrow' | 'broad' | 'foundational'

export type OfflineAnalysisReviewStatus = 'ok' | 'watch' | 'regression'

export type OfflineAnalysisFindingSeverity = 'info' | 'watch' | 'regression'

export type OfflineAnalysisFindingKind =
	| 'aggregate'
	| 'phase_regression'
	| 'phase_coverage'
	| 'phase_acceleration'
	| 'operator_imbalance'
	| 'evidence_policy'

export type OfflineAnalysisFindingMetric =
	'correctCount' | 'incorrectCount' | 'meanSkillDelta' | 'steps' | 'coverage'

export type OfflineAnalysisFinding = {
	kind: OfflineAnalysisFindingKind
	severity: OfflineAnalysisFindingSeverity
	message: string
	phase?: OfflineAnalysisPhase
	operator?: string
	metric?: OfflineAnalysisFindingMetric
	value?: number
	threshold?: number
}

export type OfflineAnalysisEvidenceSummary = {
	class: OfflineAnalysisEvidenceClass
	changeScope: OfflineAnalysisChangeScope
	sufficient: boolean
	advisoryOnly: boolean
}

export type OfflineAnalysisReviewSummary = {
	status: OfflineAnalysisReviewStatus
	evidence: OfflineAnalysisEvidenceSummary
	findings: OfflineAnalysisFinding[]
}

type PerOperatorReviewRow = {
	operator: string
	avgCorrectDelta: number
	avgMeanSkillDelta: number
}

export type OfflineAnalysisReviewInput = {
	correctCountDelta: number
	meanSkillDelta: number
	reviewedStepCount: number
	evidenceClass: OfflineAnalysisEvidenceClass
	changeScope: OfflineAnalysisChangeScope
	phaseDelta?: OfflineAnalysisPhaseMap
	phaseCoverage?: Partial<OfflineAnalysisPhaseCoverageMap>
	perOperator?: PerOperatorReviewRow[]
}

const smallCorrectnessRegressionRateThreshold = 0.02
const aggregateProgressionRegressionThreshold = 0.1
const phaseCorrectnessWatchRegressionRateThreshold = -0.01
const phaseMeanSkillWatchRegressionThreshold = -0.05
const severePhaseCorrectnessRegressionRateThreshold = 0.05
const severePhaseMeanSkillRegressionThreshold = 0.05
const minimumPhaseCoverageSteps = 20
const phaseAccelerationStepThreshold = -5
const phaseAccelerationSkillThreshold = 0.1
const operatorCorrectRegressionThreshold = -1
const operatorSkillRegressionThreshold = -0.05

function evaluateEvidence(
	input: OfflineAnalysisReviewInput
): OfflineAnalysisEvidenceSummary {
	const broadChangePolicySatisfied =
		input.changeScope === 'narrow' || input.evidenceClass === 'matrix'

	return {
		class: input.evidenceClass,
		changeScope: input.changeScope,
		sufficient: broadChangePolicySatisfied,
		advisoryOnly: !broadChangePolicySatisfied
	}
}

function evaluateEvidenceFindings(
	evidence: OfflineAnalysisEvidenceSummary
): OfflineAnalysisFinding[] {
	if (evidence.sufficient) {
		return []
	}

	return [
		{
			kind: 'evidence_policy',
			severity: 'watch',
			message: `Compare-only evidence is insufficient for ${evidence.changeScope} tuning changes; run matrix evidence before relying on this review.`
		}
	]
}

function evaluateAggregateFindings(
	input: OfflineAnalysisReviewInput
): OfflineAnalysisFinding[] {
	const reviewedStepCount = Math.max(1, input.reviewedStepCount)
	const correctnessRegressionRate = Math.max(
		0,
		-input.correctCountDelta / reviewedStepCount
	)
	const progressionRegression = Math.max(0, -input.meanSkillDelta)
	const severity: OfflineAnalysisFindingSeverity =
		correctnessRegressionRate <= smallCorrectnessRegressionRateThreshold &&
		progressionRegression <= aggregateProgressionRegressionThreshold
			? 'watch'
			: 'regression'
	const findings: OfflineAnalysisFinding[] = []

	if (correctnessRegressionRate > 0) {
		findings.push({
			kind: 'aggregate',
			severity,
			metric: 'correctCount',
			value: input.correctCountDelta,
			threshold: -smallCorrectnessRegressionRateThreshold * reviewedStepCount,
			message:
				severity === 'regression'
					? 'Aggregate correctness regressed beyond the review envelope.'
					: 'Aggregate correctness shows a small tradeoff that merits follow-up validation.'
		})
	}

	if (progressionRegression > 0) {
		findings.push({
			kind: 'aggregate',
			severity,
			metric: 'meanSkillDelta',
			value: input.meanSkillDelta,
			threshold: -aggregateProgressionRegressionThreshold,
			message:
				severity === 'regression'
					? 'Aggregate progression regressed beyond the review envelope.'
					: 'Aggregate progression shows a small tradeoff that merits follow-up validation.'
		})
	}

	return findings
}

function hasSufficientCoverage(
	phase: OfflineAnalysisPhase,
	phaseCoverage: Partial<OfflineAnalysisPhaseCoverageMap> | undefined
): boolean {
	return (phaseCoverage?.[phase] ?? 0) >= minimumPhaseCoverageSteps
}

function phaseCorrectnessRegressionRate(
	phase: OfflineAnalysisPhase,
	phaseDelta: OfflineAnalysisPhaseMap,
	phaseCoverage: Partial<OfflineAnalysisPhaseCoverageMap> | undefined
): number {
	const coverage = Math.max(
		1,
		phaseCoverage?.[phase] ?? Math.abs(phaseDelta[phase].steps)
	)
	return phaseDelta[phase].correctCount / coverage
}

function laterPhasesImprove(
	phase: OfflineAnalysisPhase,
	phaseDelta: OfflineAnalysisPhaseMap,
	phaseCoverage: Partial<OfflineAnalysisPhaseCoverageMap> | undefined
): boolean {
	const phaseIndex = offlineAnalysisPhases.indexOf(phase)
	return offlineAnalysisPhases.slice(phaseIndex + 1).every((laterPhase) => {
		const delta = phaseDelta[laterPhase]
		if (!hasSufficientCoverage(laterPhase, phaseCoverage)) {
			return true
		}
		return delta.correctCount >= 0 && delta.meanSkillDelta >= -0.05
	})
}

function createPhaseAccelerationFinding(
	phaseDelta: OfflineAnalysisPhaseMap | undefined,
	phaseCoverage: Partial<OfflineAnalysisPhaseCoverageMap> | undefined
): OfflineAnalysisFinding | undefined {
	if (phaseDelta === undefined) {
		return undefined
	}

	for (const phase of offlineAnalysisPhases) {
		const delta = phaseDelta[phase]
		if (
			delta.steps <= phaseAccelerationStepThreshold &&
			delta.meanSkillDelta >= phaseAccelerationSkillThreshold &&
			laterPhasesImprove(phase, phaseDelta, phaseCoverage)
		) {
			return {
				kind: 'phase_acceleration',
				severity: 'info',
				phase,
				metric: 'steps',
				value: delta.steps,
				message: `${phase} phase compressed with improved efficiency; this may reduce trivial grinding if later-stage performance remains stable.`
			}
		}
	}

	return undefined
}

function evaluatePhaseFindings(
	input: OfflineAnalysisReviewInput
): OfflineAnalysisFinding[] {
	if (input.phaseDelta === undefined) {
		return []
	}

	const accelerationFinding = createPhaseAccelerationFinding(
		input.phaseDelta,
		input.phaseCoverage
	)
	const acceleratedPhase = accelerationFinding?.phase
	const findings: OfflineAnalysisFinding[] = []
	for (const phase of offlineAnalysisPhases) {
		const coverage = input.phaseCoverage?.[phase] ?? 0
		const delta = input.phaseDelta[phase]
		if (coverage > 0 && coverage < minimumPhaseCoverageSteps) {
			findings.push({
				kind: 'phase_coverage',
				severity: input.changeScope === 'narrow' ? 'info' : 'watch',
				phase,
				metric: 'coverage',
				value: coverage,
				threshold: minimumPhaseCoverageSteps,
				message: `${phase} phase coverage is below threshold; conclusions for this learner stage are weak.`
			})
		}

		if (!hasSufficientCoverage(phase, input.phaseCoverage)) {
			continue
		}

		const correctnessRate = phaseCorrectnessRegressionRate(
			phase,
			input.phaseDelta,
			input.phaseCoverage
		)
		const isAcceleratedPhase = phase === acceleratedPhase
		const hasCorrectnessRegression =
			!isAcceleratedPhase &&
			correctnessRate < phaseCorrectnessWatchRegressionRateThreshold
		const hasMeanSkillRegression =
			delta.meanSkillDelta < phaseMeanSkillWatchRegressionThreshold
		const severe =
			correctnessRate < -severePhaseCorrectnessRegressionRateThreshold ||
			delta.meanSkillDelta < -severePhaseMeanSkillRegressionThreshold
		if (hasCorrectnessRegression || hasMeanSkillRegression) {
			findings.push({
				kind: 'phase_regression',
				severity: severe ? 'regression' : 'watch',
				phase,
				metric: hasCorrectnessRegression ? 'correctCount' : 'meanSkillDelta',
				value: hasCorrectnessRegression
					? delta.correctCount
					: delta.meanSkillDelta,
				threshold: hasCorrectnessRegression
					? -severePhaseCorrectnessRegressionRateThreshold *
						Math.max(1, input.phaseCoverage?.[phase] ?? 1)
					: -severePhaseMeanSkillRegressionThreshold,
				message: `${phase} phase regressed; validate the learning-stage tradeoff before accepting this tuning change.`
			})
		}
	}

	if (accelerationFinding !== undefined) {
		findings.push(accelerationFinding)
	}

	return findings
}

function evaluateOperatorFindings(
	input: OfflineAnalysisReviewInput
): OfflineAnalysisFinding[] {
	return (input.perOperator ?? [])
		.filter(
			(row) =>
				row.avgCorrectDelta < operatorCorrectRegressionThreshold ||
				row.avgMeanSkillDelta < operatorSkillRegressionThreshold
		)
		.map((row) => ({
			kind: 'operator_imbalance',
			severity: 'regression',
			operator: row.operator,
			metric:
				row.avgCorrectDelta < operatorCorrectRegressionThreshold
					? 'correctCount'
					: 'meanSkillDelta',
			value:
				row.avgCorrectDelta < operatorCorrectRegressionThreshold
					? row.avgCorrectDelta
					: row.avgMeanSkillDelta,
			threshold:
				row.avgCorrectDelta < operatorCorrectRegressionThreshold
					? operatorCorrectRegressionThreshold
					: operatorSkillRegressionThreshold,
			message: `${row.operator} regressed in matrix review; validate operator-specific difficulty balance.`
		}))
}

export function deriveOfflineAnalysisReviewStatus(
	findings: OfflineAnalysisFinding[],
	evidenceSufficient: boolean
): OfflineAnalysisReviewStatus {
	if (findings.some((finding) => finding.severity === 'regression')) {
		return 'regression'
	}

	if (
		!evidenceSufficient ||
		findings.some((finding) => finding.severity === 'watch')
	) {
		return 'watch'
	}

	return 'ok'
}

export function buildOfflineAnalysisReview(
	input: OfflineAnalysisReviewInput
): OfflineAnalysisReviewSummary {
	const evidence = evaluateEvidence(input)
	const findings = [
		...evaluateAggregateFindings(input),
		...evaluatePhaseFindings(input),
		...evaluateOperatorFindings(input),
		...evaluateEvidenceFindings(evidence)
	]

	return {
		status: deriveOfflineAnalysisReviewStatus(findings, evidence.sufficient),
		evidence,
		findings
	}
}

export function prioritizeOfflineAnalysisFindings(
	findings: OfflineAnalysisFinding[]
): OfflineAnalysisFinding[] {
	const severityRank: Record<OfflineAnalysisFindingSeverity, number> = {
		regression: 0,
		watch: 1,
		info: 2
	}
	const kindRank: Record<OfflineAnalysisFindingKind, number> = {
		evidence_policy: 0,
		phase_regression: 1,
		operator_imbalance: 2,
		aggregate: 3,
		phase_coverage: 4,
		phase_acceleration: 5
	}

	return [...findings].sort((a, b) => {
		const severityDelta = severityRank[a.severity] - severityRank[b.severity]
		if (severityDelta !== 0) {
			return severityDelta
		}
		return kindRank[a.kind] - kindRank[b.kind]
	})
}
