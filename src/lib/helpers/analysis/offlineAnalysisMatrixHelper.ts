import type {
	MatrixPhaseSummaryRow,
	OfflineAnalysisComparison,
	OfflineAnalysisPhaseCoverageMap,
	OfflineAnalysisPhaseMap
} from '#lib/helpers/analysis/offlineAnalysisHelper.ts'
import {
	summarizePhaseCoverage,
	summarizePhaseDelta
} from '#lib/helpers/analysis/offlineAnalysisHelper.ts'
import type { OfflineAnalysisOperatorName } from '#lib/helpers/analysis/offlineAnalysisCliHelper.ts'
import { operatorOrder } from '#lib/helpers/analysis/offlineAnalysisCliHelper.ts'
import {
	mapOperatorTuple,
	type OperatorTuple
} from '#lib/domain/skill-progression/skillModel.ts'
import { mapOfflineAnalysisPhases } from '#lib/models/OfflineAnalysisTypes.ts'

const skillIndexes = [0, 1, 2, 3] as const

export type MatrixSummaryRow = MatrixPhaseSummaryRow & {
	seed: number
	operator: OfflineAnalysisOperatorName
	correctDelta: number
	incorrectDelta: number
	meanSkillDelta: number
	finalSkillDelta: OperatorTuple<number>
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
		avgFinalSkillDelta: OperatorTuple<number>
	}>
}

export function resolveComparisonPhaseCoverage(
	comparison: OfflineAnalysisComparison
): OfflineAnalysisPhaseCoverageMap {
	return mapOfflineAnalysisPhases((phase) =>
		Math.min(
			comparison.phaseSummaries.baseline[phase].steps,
			comparison.phaseSummaries.candidate[phase].steps
		)
	)
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
			totalFinalSkillDelta: OperatorTuple<number>
		}
	>()
	for (const row of rows) {
		const current = grouped.get(row.operator) ?? {
			runs: 0,
			totalCorrectDelta: 0,
			totalIncorrectDelta: 0,
			totalMeanSkillDelta: 0,
			totalFinalSkillDelta: [0, 0, 0, 0] satisfies OperatorTuple<number>
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

		const avgFinalSkillDelta = mapOperatorTuple(
			value.totalFinalSkillDelta,
			(total) => Number((total / value.runs).toFixed(2))
		)

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
