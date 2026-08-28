import { describe, expect, it } from 'vitest'
import { adaptiveTuning } from '#lib/models/AdaptiveProfile.ts'
import {
	compareOfflineAnalysisResults,
	createDefaultOfflineScenario,
	loadTuningSnapshot,
	runOfflineAnalysis
} from '#lib/helpers/analysis/offlineAnalysisHelper.ts'
import {
	resolveComparisonPhaseCoverage,
	summarizeMatrix
} from '#lib/helpers/analysis/offlineAnalysisMatrixHelper.ts'

describe('resolveComparisonPhaseCoverage', () => {
	it('takes the conservative (minimum) step count per phase across baseline and candidate', () => {
		const baselineScenario = {
			...createDefaultOfflineScenario(),
			title: 'baseline',
			steps: 100,
			seed: 7,
			tuning: loadTuningSnapshot(adaptiveTuning)
		}
		const candidateScenario = {
			...baselineScenario,
			title: 'candidate',
			steps: 30
		}

		const comparison = compareOfflineAnalysisResults(
			runOfflineAnalysis(baselineScenario),
			runOfflineAnalysis(candidateScenario)
		)

		// Sanity check this isn't a vacuous test: baseline and candidate must
		// actually differ in per-phase step counts, otherwise a min/max/either-side
		// bug in the implementation would be indistinguishable from correct output.
		expect(comparison.phaseSummaries.baseline).not.toEqual(
			comparison.phaseSummaries.candidate
		)

		expect(resolveComparisonPhaseCoverage(comparison)).toEqual({
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
		})
	})
})

describe('summarizeMatrix', () => {
	it('returns a zeroed summary for empty matrix rows', () => {
		const summary = summarizeMatrix([])

		expect(summary.overall).toEqual({
			runs: 0,
			avgCorrectDelta: 0,
			avgIncorrectDelta: 0,
			avgMeanSkillDelta: 0
		})
		expect(summary.phaseCoverage).toEqual({ early: 0, mid: 0, late: 0 })
		expect(summary.phaseDelta).toEqual({
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
		})
		expect(summary.perOperator).toEqual([])
	})
})
