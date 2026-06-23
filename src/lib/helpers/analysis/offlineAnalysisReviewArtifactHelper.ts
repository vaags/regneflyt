import type {
	OfflineAnalysisChangeScope,
	OfflineAnalysisComparison,
	OfflineAnalysisPhaseCoverageMap,
	OfflineAnalysisPhaseMap
} from '$lib/helpers/analysis/offlineAnalysisHelper'
import {
	createOfflineAnalysisRecommendation,
	formatOfflineAnalysisComparison,
	formatOfflineAnalysisRecommendation
} from '$lib/helpers/analysis/offlineAnalysisHelper'
import type {
	MatrixPhaseSummaryRow,
	OfflineAnalysisOperatorName
} from '$lib/helpers/analysis/offlineAnalysisCliHelper'
import {
	operatorOrder,
	summarizePhaseCoverage,
	summarizePhaseDelta
} from '$lib/helpers/analysis/offlineAnalysisCliHelper'

export const offlineAnalysisJsonSchemaVersion = '2.0.0'
const skillIndexes = [0, 1, 2, 3] as const

export type MatrixSummaryRow = MatrixPhaseSummaryRow & {
	seed: number
	operator: OfflineAnalysisOperatorName
	correctDelta: number
	incorrectDelta: number
	meanSkillDelta: number
	finalSkillDelta: [number, number, number, number]
}

export type MatrixSummary = {
	overall: {
		runs: number
		avgCorrectDelta: number
		avgIncorrectDelta: number
		avgMeanSkillDelta: number
	}
	phaseCoverage: OfflineAnalysisPhaseCoverageMap
	phaseDelta: OfflineAnalysisPhaseMap
	perOperator: Array<{
		operator: OfflineAnalysisOperatorName
		runs: number
		avgCorrectDelta: number
		avgIncorrectDelta: number
		avgMeanSkillDelta: number
		avgFinalSkillDelta: [number, number, number, number]
	}>
}

export type ComparisonReviewContext = {
	preset?: string
	scope: OfflineAnalysisChangeScope
}

export type MatrixReviewContext = {
	preset?: string
	scope: OfflineAnalysisChangeScope
	seeds: number[]
	operators: OfflineAnalysisOperatorName[]
	steps: number
}

export function resolveComparisonPhaseCoverage(
	comparison: OfflineAnalysisComparison
): OfflineAnalysisPhaseCoverageMap {
	return {
		early: Math.min(
			comparison.phaseSummaries.baseline.early.steps,
			comparison.phaseSummaries.candidate.early.steps
		),
		mid: Math.min(
			comparison.phaseSummaries.baseline.mid.steps,
			comparison.phaseSummaries.candidate.mid.steps
		),
		late: Math.min(
			comparison.phaseSummaries.baseline.late.steps,
			comparison.phaseSummaries.candidate.late.steps
		)
	}
}

function formatDecisionSignal(
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

function formatPhaseSummaryLine(
	label: string,
	phaseSummary: OfflineAnalysisPhaseMap['early']
): string {
	return `${label}: steps=${phaseSummary.steps}, correct=${phaseSummary.correctCount}, incorrect=${phaseSummary.incorrectCount}, meanSkill=${phaseSummary.meanSkillDelta.toFixed(2)}`
}

function formatPhaseDeltaLine(
	label: string,
	phaseSummary: OfflineAnalysisPhaseMap['early']
): string {
	return `${label}: stepDelta=${phaseSummary.steps}, correctDelta=${phaseSummary.correctCount}, incorrectDelta=${phaseSummary.incorrectCount}, meanSkillDelta=${phaseSummary.meanSkillDelta.toFixed(2)}`
}

function composeStructuredReviewText(sections: {
	findings: string[]
	interpretation: string[]
	metadata: Array<string | undefined>
}): string {
	return [
		'═══ FINDINGS ═══',
		...sections.findings,
		'',
		'═══ INTERPRETATION ═══',
		...sections.interpretation,
		'',
		'═══ METADATA ═══',
		...sections.metadata
	]
		.filter((line): line is string => line !== undefined)
		.join('\n')
}

/**
 * Compute operator-level breakdown showing individual vs mixed mode performance.
 * Individual operators: per-operator correctness and skill deltas
 * Mixed mode: "all" operator performance (different selection logic)
 */
function computeOperatorBreakdown(summary: MatrixSummary): {
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
} {
	const individual = summary.perOperator
		.filter((row) => row.operator !== 'all')
		.map((row) => {
			let verdict: 'good' | 'neutral' | 'concerning' = 'neutral'
			if (row.avgMeanSkillDelta > 0.1) {
				verdict = 'good'
			} else if (row.avgMeanSkillDelta < -0.1) {
				verdict = 'concerning'
			}
			return {
				operator: row.operator,
				verdict,
				meanSkillDelta: row.avgMeanSkillDelta,
				correctDelta: row.avgCorrectDelta
			}
		})

	const mixed = summary.perOperator.find((row) => row.operator === 'all')
	const allIndividual = summary.perOperator.filter(
		(row) => row.operator !== 'all'
	)
	const allPositive = allIndividual.every((row) => row.avgMeanSkillDelta >= 0)

	if (mixed) {
		const verdict: 'good' | 'neutral' | 'imbalanced' =
			Math.abs(mixed.avgMeanSkillDelta) < 0.1 && allPositive
				? 'neutral'
				: Math.abs(mixed.avgMeanSkillDelta) < 0.05
					? 'good'
					: 'imbalanced'

		const result: {
			verdict: 'good' | 'neutral' | 'imbalanced'
			meanSkillDelta: number
			correctDelta: number
			note?: string
		} = {
			verdict,
			meanSkillDelta: mixed.avgMeanSkillDelta,
			correctDelta: mixed.avgCorrectDelta
		}

		if (allPositive && Math.abs(mixed.avgMeanSkillDelta) < 0.1) {
			result.note =
				'Individual operators strong; mixed mode variance contextual'
		}

		return {
			individual,
			mixed: result
		}
	}

	return {
		individual,
		mixed: {
			verdict: 'neutral',
			meanSkillDelta: 0,
			correctDelta: 0
		}
	}
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

export function summarizeMatrix(rows: MatrixSummaryRow[]): MatrixSummary {
	if (rows.length === 0) {
		return {
			overall: {
				runs: 0,
				avgCorrectDelta: 0,
				avgIncorrectDelta: 0,
				avgMeanSkillDelta: 0
			},
			phaseCoverage: summarizePhaseCoverage(rows),
			phaseDelta: summarizePhaseDelta(rows),
			perOperator: []
		}
	}

	const grouped = new Map<
		OfflineAnalysisOperatorName,
		{
			runs: number
			totalCorrectDelta: number
			totalIncorrectDelta: number
			totalMeanSkillDelta: number
			totalFinalSkillDelta: [number, number, number, number]
		}
	>()
	for (const row of rows) {
		const current = grouped.get(row.operator) ?? {
			runs: 0,
			totalCorrectDelta: 0,
			totalIncorrectDelta: 0,
			totalMeanSkillDelta: 0,
			totalFinalSkillDelta: [0, 0, 0, 0] as [number, number, number, number]
		}
		current.runs += 1
		current.totalCorrectDelta += row.correctDelta
		current.totalIncorrectDelta += row.incorrectDelta
		current.totalMeanSkillDelta += row.meanSkillDelta
		for (const index of skillIndexes) {
			current.totalFinalSkillDelta[index] += row.finalSkillDelta[index]
		}
		grouped.set(row.operator, current)
	}

	const perOperator: MatrixSummary['perOperator'] = []
	for (const operator of operatorOrder) {
		const value = grouped.get(operator)
		if (value === undefined) {
			continue
		}

		const avgFinalSkillDelta: [number, number, number, number] = [
			Number((value.totalFinalSkillDelta[0] / value.runs).toFixed(2)),
			Number((value.totalFinalSkillDelta[1] / value.runs).toFixed(2)),
			Number((value.totalFinalSkillDelta[2] / value.runs).toFixed(2)),
			Number((value.totalFinalSkillDelta[3] / value.runs).toFixed(2))
		]

		perOperator.push({
			operator,
			runs: value.runs,
			avgCorrectDelta: Number(
				(value.totalCorrectDelta / value.runs).toFixed(2)
			),
			avgIncorrectDelta: Number(
				(value.totalIncorrectDelta / value.runs).toFixed(2)
			),
			avgMeanSkillDelta: Number(
				(value.totalMeanSkillDelta / value.runs).toFixed(4)
			),
			avgFinalSkillDelta
		})
	}

	const totalRuns = rows.length
	const totalCorrectDelta = rows.reduce((sum, row) => sum + row.correctDelta, 0)
	const totalIncorrectDelta = rows.reduce(
		(sum, row) => sum + row.incorrectDelta,
		0
	)
	const totalMeanSkillDelta = rows.reduce(
		(sum, row) => sum + row.meanSkillDelta,
		0
	)

	return {
		overall: {
			runs: totalRuns,
			avgCorrectDelta: Number((totalCorrectDelta / totalRuns).toFixed(2)),
			avgIncorrectDelta: Number((totalIncorrectDelta / totalRuns).toFixed(2)),
			avgMeanSkillDelta: Number((totalMeanSkillDelta / totalRuns).toFixed(4))
		},
		phaseCoverage: summarizePhaseCoverage(rows),
		phaseDelta: summarizePhaseDelta(rows),
		perOperator
	}
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

export function buildComparisonReviewArtifact(
	comparison: OfflineAnalysisComparison,
	context: ComparisonReviewContext
): { text: string; payload: Record<string, unknown> } {
	const phaseCoverage = resolveComparisonPhaseCoverage(comparison)
	const recommendation = createOfflineAnalysisRecommendation({
		correctCountDelta: comparison.delta.correctCount,
		meanSkillDelta: comparison.delta.meanSkillDelta,
		evidenceClass: 'compare',
		changeScope: context.scope,
		phaseDelta: comparison.phaseDelta,
		phaseEfficiencyBaseline: {
			early: comparison.phaseSummaries.baseline.early.meanSkillDelta,
			mid: comparison.phaseSummaries.baseline.mid.meanSkillDelta,
			late: comparison.phaseSummaries.baseline.late.meanSkillDelta
		},
		reviewedStepCount: Math.min(
			comparison.baseline.steps,
			comparison.candidate.steps
		),
		phaseCoverage
	})
	const policyLine = recommendation.policy.broadChangePolicySatisfied
		? `Policy: evidence sufficient for ${context.scope} changes`
		: `Policy: matrix evidence required before approving ${context.scope} changes`
	const findings = [
		formatOfflineAnalysisComparison(comparison),
		formatPhaseSummaryLine(
			'Baseline early phase summary',
			comparison.phaseSummaries.baseline.early
		),
		formatPhaseSummaryLine(
			'Baseline mid phase summary',
			comparison.phaseSummaries.baseline.mid
		),
		formatPhaseSummaryLine(
			'Baseline late phase summary',
			comparison.phaseSummaries.baseline.late
		),
		formatPhaseSummaryLine(
			'Candidate early phase summary',
			comparison.phaseSummaries.candidate.early
		),
		formatPhaseSummaryLine(
			'Candidate mid phase summary',
			comparison.phaseSummaries.candidate.mid
		),
		formatPhaseSummaryLine(
			'Candidate late phase summary',
			comparison.phaseSummaries.candidate.late
		),
		formatPhaseDeltaLine('Early phase delta', comparison.phaseDelta.early),
		formatPhaseDeltaLine('Mid phase delta', comparison.phaseDelta.mid),
		formatPhaseDeltaLine('Late phase delta', comparison.phaseDelta.late),
		`Key deltas: correct=${comparison.delta.correctCount}, incorrect=${comparison.delta.incorrectCount}, meanSkill=${comparison.delta.meanSkillDelta.toFixed(2)}`,
		formatDecisionSignal(
			comparison.delta.correctCount,
			comparison.delta.meanSkillDelta
		)
	]
	const interpretation = [formatOfflineAnalysisRecommendation(recommendation)]
	const metadata = [
		context.preset !== undefined ? `Preset: ${context.preset}` : undefined,
		`Scope: ${context.scope}`,
		`Evidence: compare, seed=${comparison.baseline.scenario.seed}, steps=${comparison.baseline.steps}`,
		policyLine
	]

	return {
		text: composeStructuredReviewText({
			findings,
			interpretation,
			metadata
		}),
		payload: {
			jsonSchemaVersion: offlineAnalysisJsonSchemaVersion,
			mode: 'compare',
			preset: context.preset ?? null,
			evidence: {
				class: 'compare',
				changeScope: context.scope
			},
			policy: recommendation.policy,
			recommendation,
			comparison: {
				baseline: {
					title: comparison.baseline.scenario.title,
					seed: comparison.baseline.scenario.seed,
					steps: comparison.baseline.steps,
					phaseSummaries: comparison.phaseSummaries.baseline
				},
				candidate: {
					title: comparison.candidate.scenario.title,
					seed: comparison.candidate.scenario.seed,
					steps: comparison.candidate.steps,
					phaseSummaries: comparison.phaseSummaries.candidate
				}
			},
			delta: comparison.delta,
			phaseDelta: comparison.phaseDelta
		}
	}
}

export function buildMatrixReviewArtifact(
	summary: MatrixSummary,
	rows: MatrixSummaryRow[],
	context: MatrixReviewContext
): { text: string; payload: Record<string, unknown> } {
	const operatorImbalanceNotes = summary.perOperator.filter(
		(row) => row.avgCorrectDelta < -1 || row.avgMeanSkillDelta < -0.05
	)
	const operatorBreakdown = computeOperatorBreakdown(summary)

	const recommendation = createOfflineAnalysisRecommendation({
		correctCountDelta: summary.overall.avgCorrectDelta,
		meanSkillDelta: summary.overall.avgMeanSkillDelta,
		operatorImbalance: operatorImbalanceNotes.length > 0,
		evidenceClass: 'matrix',
		changeScope: context.scope,
		phaseDelta: summary.phaseDelta,
		reviewedStepCount: context.steps,
		phaseCoverage: summary.phaseCoverage,
		operatorBreakdown
	})
	const policyLine = recommendation.policy.broadChangePolicySatisfied
		? `Policy: evidence sufficient for ${context.scope} changes`
		: `Policy: matrix evidence required before approving ${context.scope} changes`
	const findings = [formatMatrixReport(summary)]
	const interpretation = [formatOfflineAnalysisRecommendation(recommendation)]
	const metadata = [
		context.preset !== undefined ? `Preset: ${context.preset}` : undefined,
		`Scope: ${context.scope}`,
		`Evidence: matrix, seeds=${context.seeds.join(',')}, operators=${context.operators.join(',')}`,
		policyLine,
		operatorImbalanceNotes.length > 0
			? `⚠ Operator imbalance detected: ${operatorImbalanceNotes
					.map(
						(row) =>
							`${row.operator} (correct=${row.avgCorrectDelta}, meanSkill=${row.avgMeanSkillDelta})`
					)
					.join('; ')}`
			: undefined
	]

	return {
		text: composeStructuredReviewText({
			findings,
			interpretation,
			metadata
		}),
		payload: {
			jsonSchemaVersion: offlineAnalysisJsonSchemaVersion,
			mode: 'matrix',
			preset: context.preset ?? null,
			evidence: {
				class: 'matrix',
				changeScope: context.scope
			},
			policy: recommendation.policy,
			recommendation,
			summary,
			phaseDelta: summary.phaseDelta,
			rows,
			seeds: context.seeds,
			operators: context.operators,
			steps: context.steps,
			operatorImbalanceNotes: operatorImbalanceNotes.map((row) => ({
				operator: row.operator,
				avgCorrectDelta: row.avgCorrectDelta,
				avgMeanSkillDelta: row.avgMeanSkillDelta
			})),
			operatorBreakdown
		}
	}
}
