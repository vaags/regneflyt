import type {
	MatrixPhaseSummaryRow,
	OfflineAnalysisComparison,
	OfflineAnalysisPhaseCoverageMap,
	OfflineAnalysisPhaseMap
} from '$lib/helpers/analysis/offlineAnalysisHelper'
import {
	summarizePhaseCoverage,
	summarizePhaseDelta
} from '$lib/helpers/analysis/offlineAnalysisHelper'
import type { OfflineAnalysisOperatorName } from '$lib/helpers/analysis/offlineAnalysisCliHelper'
import { operatorOrder } from '$lib/helpers/analysis/offlineAnalysisCliHelper'

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
