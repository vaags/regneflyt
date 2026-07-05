import { formatOfflineAnalysisComparison } from '$lib/helpers/analysis/offlineAnalysisHelper'
import type {
	OfflineAnalysisComparison,
	OfflineAnalysisPhaseMap
} from '$lib/helpers/analysis/offlineAnalysisHelper'
import {
	prioritizeOfflineAnalysisFindings,
	type OfflineAnalysisFinding,
	type OfflineAnalysisReviewStatus,
	type OfflineAnalysisReviewSummary
} from '$lib/helpers/analysis/offlineAnalysisReviewHelper'
import type { MatrixSummary } from '$lib/helpers/analysis/offlineAnalysisMatrixHelper'

const reviewStatusLabels = {
	ok: 'ok (no modeled regression detected)',
	watch: 'watch (review required)',
	regression: 'regression (modeled regression detected)'
} satisfies Record<OfflineAnalysisReviewStatus, string>

export function formatDecisionSignal(
	correctDelta: number,
	meanSkillDelta: number
): string {
	const accuracySignal =
		correctDelta > 0
			? 'higher-correctness'
			: correctDelta < 0
				? 'lower-correctness'
				: 'flat-correctness'
	const progressionSignal =
		meanSkillDelta > 0
			? 'faster-progression'
			: meanSkillDelta < 0
				? 'slower-progression'
				: 'flat-progression'

	return `Signal: ${accuracySignal}, ${progressionSignal}`
}

export function formatPhaseSummaryLine(
	label: string,
	phaseSummary: OfflineAnalysisPhaseMap['early']
): string {
	return `${label}: steps=${phaseSummary.steps}, correct=${phaseSummary.correctCount}, incorrect=${phaseSummary.incorrectCount}, meanSkill=${phaseSummary.meanSkillDelta.toFixed(2)}`
}

export function formatPhaseDeltaLine(
	label: string,
	phaseSummary: OfflineAnalysisPhaseMap['early']
): string {
	return `${label}: stepDelta=${phaseSummary.steps}, correctDelta=${phaseSummary.correctCount}, incorrectDelta=${phaseSummary.incorrectCount}, meanSkillDelta=${phaseSummary.meanSkillDelta.toFixed(2)}`
}

export function composeStructuredReviewText(sections: {
	metrics: string[]
	review: string[]
	metadata: Array<string | undefined>
}): string {
	return [
		'═══ METRICS ═══',
		...sections.metrics,
		'',
		'═══ SIMULATED PROGRESSION REVIEW ═══',
		...sections.review,
		'',
		'═══ METADATA ═══',
		...sections.metadata.filter((line): line is string => line !== undefined)
	].join('\n')
}

function formatFinding(finding: OfflineAnalysisFinding): string {
	const scope = finding.phase ?? finding.operator
	const scopePrefix = scope !== undefined ? `${scope}: ` : ''
	const value =
		finding.value !== undefined
			? ` (${finding.metric ?? 'value'}=${finding.value.toFixed(4)})`
			: ''
	return `- [${finding.severity}] ${scopePrefix}${finding.message}${value}`
}

export function formatSimulatedProgressionReview(
	review: OfflineAnalysisReviewSummary
): string {
	const keyFindings = prioritizeOfflineAnalysisFindings(review.findings).slice(
		0,
		5
	)
	const findingLines =
		keyFindings.length > 0
			? keyFindings.map(formatFinding)
			: [
					'- [info] No simulated progression concerns were detected for the reviewed scenarios.'
				]

	return [
		`Status: ${reviewStatusLabels[review.status]}`,
		`Evidence: ${review.evidence.class}, scope=${review.evidence.changeScope}, sufficient=${review.evidence.sufficient}`,
		'',
		'Key findings:',
		...findingLines,
		review.findings.length > keyFindings.length
			? `- [info] ${review.findings.length - keyFindings.length} additional finding(s) available in JSON artifact.`
			: undefined,
		'',
		'Next steps:',
		'- Inspect watch/regression findings before relying on this review.',
		'- Treat this as simulated adaptive-model evidence, not pedagogical approval.',
		'- Broad/foundational changes still need matrix evidence and targeted validation.'
	]
		.filter((line): line is string => line !== undefined)
		.join('\n')
}

export function formatComparisonWithDecision(
	comparison: OfflineAnalysisComparison
): string {
	const baseReport = formatOfflineAnalysisComparison(comparison)
	return [
		baseReport,
		formatDecisionSignal(
			comparison.delta.correctCount,
			comparison.delta.meanSkillDelta
		),
		`Scope: seed=${comparison.baseline.scenario.seed}, steps=${comparison.baseline.steps}`
	].join('\n')
}

export function formatMatrixReport(summary: MatrixSummary): string {
	const lines = [
		`Runs: ${summary.overall.runs}`,
		'',
		'Overall Metrics:',
		`  Correctness: ${summary.overall.avgCorrectDelta > 0 ? '+' : ''}${summary.overall.avgCorrectDelta}`,
		`  Progression: ${summary.overall.avgMeanSkillDelta > 0 ? '+' : ''}${summary.overall.avgMeanSkillDelta.toFixed(4)}`,
		'',
		'Phase Breakdown:',
		`  ${formatPhaseDeltaLine('Early', summary.phaseDelta.early)}`,
		`  ${formatPhaseDeltaLine('Mid', summary.phaseDelta.mid)}`,
		`  ${formatPhaseDeltaLine('Late', summary.phaseDelta.late)}`,
		''
	]

	if (summary.perOperator.length > 0) {
		lines.push('Per-Operator Analysis:')
		for (const row of summary.perOperator) {
			lines.push(
				`  ${row.operator}: correct=${row.avgCorrectDelta > 0 ? '+' : ''}${row.avgCorrectDelta.toFixed(2)}, skill=${row.avgMeanSkillDelta > 0 ? '+' : ''}${row.avgMeanSkillDelta.toFixed(4)}`
			)
		}
		lines.push('')
	}

	lines.push(
		formatDecisionSignal(
			summary.overall.avgCorrectDelta,
			summary.overall.avgMeanSkillDelta
		)
	)

	return lines.join('\n')
}
