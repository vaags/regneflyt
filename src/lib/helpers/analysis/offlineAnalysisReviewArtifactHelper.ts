import { formatOfflineAnalysisComparison } from '#lib/helpers/analysis/offlineAnalysisHelper.ts'
import type { OfflineAnalysisComparison } from '#lib/helpers/analysis/offlineAnalysisHelper.ts'
import {
	buildOfflineAnalysisReview,
	type OfflineAnalysisChangeScope
} from '#lib/helpers/analysis/offlineAnalysisReviewHelper.ts'
import type { OfflineAnalysisOperatorName } from '#lib/helpers/analysis/offlineAnalysisCliHelper.ts'
import {
	resolveComparisonPhaseCoverage,
	type MatrixSummary,
	type MatrixSummaryRow
} from '#lib/helpers/analysis/offlineAnalysisMatrixHelper.ts'
import {
	composeStructuredReviewText,
	formatDecisionSignal,
	formatMatrixReport,
	formatPhaseDeltaLine,
	formatPhaseSummaryLine,
	formatSimulatedProgressionReview
} from '#lib/helpers/analysis/offlineAnalysisReportFormatHelper.ts'

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

export function buildComparisonReviewArtifact(
	comparison: OfflineAnalysisComparison,
	context: ComparisonReviewContext
): { text: string; payload: Record<string, unknown> } {
	const phaseCoverage = resolveComparisonPhaseCoverage(comparison)
	const reviewedStepCount = Math.min(
		comparison.baseline.steps,
		comparison.candidate.steps
	)
	const review = buildOfflineAnalysisReview({
		correctCountDelta: comparison.delta.correctCount,
		meanSkillDelta: comparison.delta.meanSkillDelta,
		evidenceClass: 'compare',
		changeScope: context.scope,
		phaseDelta: comparison.phaseDelta,
		reviewedStepCount,
		phaseCoverage
	})
	const policyLine = review.evidence.sufficient
		? `Policy: evidence scope is sufficient for this simulated ${context.scope} tuning review`
		: `Policy: matrix evidence required before relying on this ${context.scope} tuning review`
	const metrics = [
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
	const reviewLines = [formatSimulatedProgressionReview(review)]
	const metadata = [
		context.preset !== undefined ? `Preset: ${context.preset}` : undefined,
		`Scope: ${context.scope}`,
		`Evidence: compare, seed=${comparison.baseline.scenario.seed}, steps=${comparison.baseline.steps}`,
		policyLine
	]

	return {
		text: composeStructuredReviewText({
			metrics,
			review: reviewLines,
			metadata
		}),
		payload: {
			mode: 'compare',
			preset: context.preset ?? null,
			evidence: {
				class: 'compare',
				changeScope: context.scope
			},
			review,
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

	const review = buildOfflineAnalysisReview({
		correctCountDelta: summary.overall.avgCorrectDelta,
		meanSkillDelta: summary.overall.avgMeanSkillDelta,
		evidenceClass: 'matrix',
		changeScope: context.scope,
		phaseDelta: summary.phaseDelta,
		reviewedStepCount: context.steps,
		phaseCoverage: summary.phaseCoverage,
		perOperator: summary.perOperator
	})
	const policyLine = review.evidence.sufficient
		? `Policy: evidence scope is sufficient for this simulated ${context.scope} tuning review`
		: `Policy: matrix evidence required before relying on this ${context.scope} tuning review`
	const metrics = [formatMatrixReport(summary)]
	const reviewLines = [formatSimulatedProgressionReview(review)]
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
			metrics,
			review: reviewLines,
			metadata
		}),
		payload: {
			mode: 'matrix',
			preset: context.preset ?? null,
			evidence: {
				class: 'matrix',
				changeScope: context.scope
			},
			review,
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
			}))
		}
	}
}
