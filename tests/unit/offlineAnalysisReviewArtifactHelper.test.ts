import { describe, expect, it } from 'vitest'
import { adaptiveTuning } from '$lib/models/AdaptiveProfile'
import {
	compareOfflineAnalysisResults,
	createDefaultOfflineScenario,
	loadTuningSnapshot,
	runOfflineAnalysis
} from '$lib/helpers/analysis/offlineAnalysisHelper'
import {
	buildComparisonReviewArtifact,
	buildMatrixReviewArtifact,
	summarizeMatrix,
	type MatrixSummaryRow
} from '$lib/helpers/analysis/offlineAnalysisReviewArtifactHelper'

describe('offlineAnalysisReviewArtifactHelper', () => {
	it('builds foundational compare review as advisory-only artifact', () => {
		const baselineScenario = {
			...createDefaultOfflineScenario(),
			title: 'baseline',
			steps: 120,
			seed: 7,
			tuning: loadTuningSnapshot(adaptiveTuning)
		}
		const candidateScenario = {
			...baselineScenario,
			title: 'candidate',
			tuning: loadTuningSnapshot({
				...adaptiveTuning,
				gains: {
					...adaptiveTuning.gains,
					baseSkillGain: adaptiveTuning.gains.baseSkillGain * 1.1
				}
			})
		}

		const comparison = compareOfflineAnalysisResults(
			runOfflineAnalysis(baselineScenario),
			runOfflineAnalysis(candidateScenario)
		)
		const artifact = buildComparisonReviewArtifact(comparison, {
			scope: 'foundational'
		})

		expect(artifact.text).toContain('═══ METRICS ═══')
		expect(artifact.text).toContain('═══ SIMULATED PROGRESSION REVIEW ═══')
		expect(artifact.text).toContain('═══ METADATA ═══')
		expect(artifact.text).toContain('Status: watch (review required)')
		expect(artifact.text).toContain('Key findings:')
		expect(artifact.text).toContain(
			'Treat this as simulated adaptive-model evidence, not pedagogical approval.'
		)
		expect(artifact.text).not.toContain('Signal: Signal:')
		expect(artifact.text).toContain('Scope: foundational')
		expect(artifact.text).not.toContain('Schema:')
		expect(artifact.text).toContain('Baseline early phase summary:')
		expect(artifact.text).toContain('Candidate early phase summary:')
		expect(artifact.text).toContain('Early phase delta:')

		const payload = artifact.payload as {
			mode: string
			review: {
				status: string
				evidence: { sufficient: boolean; advisoryOnly: boolean }
				findings: Array<{ kind: string; severity: string }>
			}
		}

		expect(payload).not.toHaveProperty('jsonSchemaVersion')
		expect(payload.mode).toBe('compare')
		expect(payload.review.status).toBe('watch')
		expect(payload.review.evidence.advisoryOnly).toBe(true)
		expect(payload.review.evidence.sufficient).toBe(false)
		expect(payload.review.findings).toContainEqual(
			expect.objectContaining({
				kind: 'evidence_policy',
				severity: 'watch'
			})
		)
	})

	it('builds matrix artifact with conservative phase coverage summary', () => {
		const rows: MatrixSummaryRow[] = [
			{
				seed: 1,
				operator: 'addition',
				correctDelta: 1,
				incorrectDelta: -1,
				meanSkillDelta: 0.12,
				finalSkillDelta: [0.1, 0.2, 0.3, 0.4],
				phaseCoverage: { early: 35, mid: 42, late: 25 },
				phaseDelta: {
					early: {
						steps: 0,
						correctCount: 1,
						incorrectCount: -1,
						meanSkillDelta: 0.03
					},
					mid: {
						steps: 0,
						correctCount: 1,
						incorrectCount: -1,
						meanSkillDelta: 0.01
					},
					late: {
						steps: 0,
						correctCount: 0,
						incorrectCount: 0,
						meanSkillDelta: 0
					}
				}
			},
			{
				seed: 42,
				operator: 'subtraction',
				correctDelta: -0.5,
				incorrectDelta: 0.5,
				meanSkillDelta: 0.04,
				finalSkillDelta: [0.2, 0.3, 0.4, 0.5],
				phaseCoverage: { early: 30, mid: 30, late: 22 },
				phaseDelta: {
					early: {
						steps: 0,
						correctCount: -1,
						incorrectCount: 1,
						meanSkillDelta: -0.02
					},
					mid: {
						steps: 0,
						correctCount: 0,
						incorrectCount: 0,
						meanSkillDelta: 0.02
					},
					late: {
						steps: 0,
						correctCount: 0,
						incorrectCount: 0,
						meanSkillDelta: -0.01
					}
				}
			}
		]

		const summary = summarizeMatrix(rows)
		const artifact = buildMatrixReviewArtifact(summary, rows, {
			scope: 'broad',
			seeds: [1, 42],
			operators: ['addition', 'subtraction'],
			steps: 120
		})

		expect(artifact.text).toContain('═══ METRICS ═══')
		expect(artifact.text).toContain('═══ SIMULATED PROGRESSION REVIEW ═══')
		expect(artifact.text).toContain('═══ METADATA ═══')
		expect(artifact.text).not.toContain('Schema:')
		expect(artifact.text).toContain(
			'Status: ok (no modeled regression detected)'
		)
		expect(artifact.text).toContain(
			'No simulated progression concerns were detected for the reviewed scenarios.'
		)

		expect(summary.perOperator.map((row) => row.operator)).toEqual([
			'addition',
			'subtraction'
		])

		const payload = artifact.payload as {
			mode: string
			review: {
				status: string
				evidence: { sufficient: boolean }
				findings: Array<{ kind: string; severity: string }>
			}
			summary: {
				phaseCoverage: {
					early: number
					mid: number
					late: number
				}
			}
			rows: Array<{
				phaseCoverage: {
					early: number
					mid: number
					late: number
				}
			}>
		}

		expect(payload).not.toHaveProperty('jsonSchemaVersion')
		expect(payload.mode).toBe('matrix')
		expect(payload.review.status).toBe('ok')
		expect(payload.review.evidence.sufficient).toBe(true)
		expect(payload.review.findings).not.toContainEqual(
			expect.objectContaining({ kind: 'phase_regression' })
		)
		const minimumEarlyCoverage = Math.min(
			...payload.rows.map((row) => row.phaseCoverage.early)
		)
		const minimumMidCoverage = Math.min(
			...payload.rows.map((row) => row.phaseCoverage.mid)
		)
		const minimumLateCoverage = Math.min(
			...payload.rows.map((row) => row.phaseCoverage.late)
		)

		expect(payload.summary.phaseCoverage).toEqual({
			early: minimumEarlyCoverage,
			mid: minimumMidCoverage,
			late: minimumLateCoverage
		})
	})

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

	it('keeps per-operator metrics in the matrix summary', () => {
		const rows: MatrixSummaryRow[] = [
			{
				seed: 1,
				operator: 'addition',
				correctDelta: 1,
				incorrectDelta: -1,
				meanSkillDelta: 0.12,
				finalSkillDelta: [0.1, 0.2, 0.3, 0.4],
				phaseCoverage: { early: 35, mid: 42, late: 25 },
				phaseDelta: {
					early: {
						steps: 0,
						correctCount: 1,
						incorrectCount: -1,
						meanSkillDelta: 0.03
					},
					mid: {
						steps: 0,
						correctCount: 1,
						incorrectCount: -1,
						meanSkillDelta: 0.01
					},
					late: {
						steps: 0,
						correctCount: 0,
						incorrectCount: 0,
						meanSkillDelta: 0
					}
				}
			}
		]

		const summary = summarizeMatrix(rows)
		const artifact = buildMatrixReviewArtifact(summary, rows, {
			scope: 'narrow',
			seeds: [1],
			operators: ['addition'],
			steps: 100
		})

		const payload = artifact.payload as {
			summary: { perOperator: Array<{ operator: string }> }
		}

		expect(payload.summary.perOperator).toContainEqual(
			expect.objectContaining({ operator: 'addition' })
		)
	})
})
