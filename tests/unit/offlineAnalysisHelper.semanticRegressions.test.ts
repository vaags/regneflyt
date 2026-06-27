import { describe, expect, it } from 'vitest'
import {
	buildOfflineAnalysisReview,
	type OfflineAnalysisFinding,
	type OfflineAnalysisReviewInput,
	type OfflineAnalysisReviewStatus
} from '$lib/helpers/analysis/offlineAnalysisReviewHelper'

type CalibrationScenario = {
	title: string
	input: OfflineAnalysisReviewInput
	expectedStatus: OfflineAnalysisReviewStatus
	expectedEvidenceSatisfied: boolean
	expectedFindings?: Array<Partial<OfflineAnalysisFinding>>
	forbiddenFindings?: Array<Partial<OfflineAnalysisFinding>>
}

function expectFinding(
	findings: OfflineAnalysisFinding[],
	expected: Partial<OfflineAnalysisFinding>
): void {
	expect(findings).toContainEqual(expect.objectContaining(expected))
}

function expectNoFinding(
	findings: OfflineAnalysisFinding[],
	expected: Partial<OfflineAnalysisFinding>
): void {
	expect(findings).not.toContainEqual(expect.objectContaining(expected))
}

const zeroPhaseDelta = {
	steps: 0,
	correctCount: 0,
	incorrectCount: 0,
	meanSkillDelta: 0
}

const calibrationScenarios: CalibrationScenario[] = [
	{
		title: 'safe narrow compare change stays ok',
		input: {
			correctCountDelta: 2,
			meanSkillDelta: 0.2,
			evidenceClass: 'compare',
			changeScope: 'narrow',
			reviewedStepCount: 100
		},
		expectedStatus: 'ok',
		expectedEvidenceSatisfied: true
	},
	{
		title: 'foundational compare change remains non-approving',
		input: {
			correctCountDelta: 2,
			meanSkillDelta: 0.2,
			evidenceClass: 'compare',
			changeScope: 'foundational',
			reviewedStepCount: 100
		},
		expectedStatus: 'watch',
		expectedEvidenceSatisfied: false,
		expectedFindings: [{ kind: 'evidence_policy', severity: 'watch' }]
	},
	{
		title: 'foundational matrix change can be ok',
		input: {
			correctCountDelta: 2,
			meanSkillDelta: 0.2,
			evidenceClass: 'matrix',
			changeScope: 'foundational',
			reviewedStepCount: 100
		},
		expectedStatus: 'ok',
		expectedEvidenceSatisfied: true
	},
	{
		title: 'large aggregate correctness regression fails',
		input: {
			correctCountDelta: -4,
			meanSkillDelta: 0.2,
			evidenceClass: 'matrix',
			changeScope: 'broad',
			reviewedStepCount: 100
		},
		expectedStatus: 'regression',
		expectedEvidenceSatisfied: true,
		expectedFindings: [
			{ kind: 'aggregate', severity: 'regression', metric: 'correctCount' }
		]
	},
	{
		title: 'small proportional regression remains watch',
		input: {
			correctCountDelta: -1,
			meanSkillDelta: 0,
			evidenceClass: 'compare',
			changeScope: 'narrow',
			reviewedStepCount: 50
		},
		expectedStatus: 'watch',
		expectedEvidenceSatisfied: true,
		expectedFindings: [
			{ kind: 'aggregate', severity: 'watch', metric: 'correctCount' }
		]
	},
	{
		title: 'aggregate regression exposes both correctness and progression',
		input: {
			correctCountDelta: -3,
			meanSkillDelta: -0.12,
			evidenceClass: 'matrix',
			changeScope: 'broad',
			reviewedStepCount: 100
		},
		expectedStatus: 'regression',
		expectedEvidenceSatisfied: true,
		expectedFindings: [
			{ kind: 'aggregate', severity: 'regression', metric: 'correctCount' },
			{ kind: 'aggregate', severity: 'regression', metric: 'meanSkillDelta' }
		]
	},
	{
		title:
			'valid phase compression emits acceleration without same-phase regression',
		input: {
			correctCountDelta: 1,
			meanSkillDelta: 0.12,
			evidenceClass: 'matrix',
			changeScope: 'foundational',
			reviewedStepCount: 100,
			phaseCoverage: { early: 30, mid: 35, late: 35 },
			phaseDelta: {
				early: {
					steps: -13.67,
					correctCount: -3.1,
					incorrectCount: 3.1,
					meanSkillDelta: 0.47
				},
				mid: {
					steps: 3.27,
					correctCount: 7.27,
					incorrectCount: -4,
					meanSkillDelta: 0.076
				},
				late: {
					steps: 10.4,
					correctCount: 2.6,
					incorrectCount: -2.6,
					meanSkillDelta: -0.02
				}
			}
		},
		expectedStatus: 'ok',
		expectedEvidenceSatisfied: true,
		expectedFindings: [
			{ kind: 'phase_acceleration', severity: 'info', phase: 'early' }
		],
		forbiddenFindings: [
			{ kind: 'phase_regression', phase: 'early' },
			{ kind: 'phase_regression', phase: 'late' }
		]
	},
	{
		title: 'downstream severe regression prevents clean acceleration status',
		input: {
			correctCountDelta: 1,
			meanSkillDelta: 0.12,
			evidenceClass: 'matrix',
			changeScope: 'foundational',
			reviewedStepCount: 100,
			phaseCoverage: { early: 30, mid: 35, late: 35 },
			phaseDelta: {
				early: {
					steps: -13.67,
					correctCount: -3.1,
					incorrectCount: 3.1,
					meanSkillDelta: 0.47
				},
				mid: {
					steps: 3,
					correctCount: -3,
					incorrectCount: 3,
					meanSkillDelta: -0.08
				},
				late: zeroPhaseDelta
			}
		},
		expectedStatus: 'regression',
		expectedEvidenceSatisfied: true,
		expectedFindings: [
			{ kind: 'phase_regression', severity: 'regression', phase: 'mid' }
		],
		forbiddenFindings: [{ kind: 'phase_acceleration' }]
	},
	{
		title: 'tiny later-phase skill dip is tolerated by noise floor',
		input: {
			correctCountDelta: 1,
			meanSkillDelta: 0.15,
			evidenceClass: 'matrix',
			changeScope: 'broad',
			reviewedStepCount: 100,
			phaseCoverage: { early: 30, mid: 30, late: 30 },
			phaseDelta: {
				early: zeroPhaseDelta,
				mid: zeroPhaseDelta,
				late: {
					steps: 5,
					correctCount: 1,
					incorrectCount: -1,
					meanSkillDelta: -0.02
				}
			}
		},
		expectedStatus: 'ok',
		expectedEvidenceSatisfied: true,
		forbiddenFindings: [{ kind: 'phase_regression', phase: 'late' }]
	},
	{
		title: 'larger later-phase skill dip triggers regression finding',
		input: {
			correctCountDelta: 1,
			meanSkillDelta: 0.15,
			evidenceClass: 'matrix',
			changeScope: 'broad',
			reviewedStepCount: 100,
			phaseCoverage: { early: 30, mid: 30, late: 30 },
			phaseDelta: {
				early: zeroPhaseDelta,
				mid: zeroPhaseDelta,
				late: {
					steps: 5,
					correctCount: 1,
					incorrectCount: -1,
					meanSkillDelta: -0.06
				}
			}
		},
		expectedStatus: 'regression',
		expectedEvidenceSatisfied: true,
		expectedFindings: [
			{ kind: 'phase_regression', severity: 'regression', phase: 'late' }
		]
	},
	{
		title: 'operator imbalance blocks tuning candidate',
		input: {
			correctCountDelta: 1,
			meanSkillDelta: 0.1,
			evidenceClass: 'matrix',
			changeScope: 'broad',
			reviewedStepCount: 100,
			perOperator: [
				{
					operator: 'division',
					avgCorrectDelta: -2,
					avgMeanSkillDelta: -0.08
				}
			]
		},
		expectedStatus: 'regression',
		expectedEvidenceSatisfied: true,
		expectedFindings: [
			{
				kind: 'operator_imbalance',
				severity: 'regression',
				operator: 'division'
			}
		]
	},
	{
		title: 'phase coverage finding uses coverage metric',
		input: {
			correctCountDelta: 1,
			meanSkillDelta: 0.1,
			evidenceClass: 'matrix',
			changeScope: 'broad',
			reviewedStepCount: 100,
			phaseCoverage: { early: 10, mid: 30, late: 30 },
			phaseDelta: {
				early: zeroPhaseDelta,
				mid: zeroPhaseDelta,
				late: zeroPhaseDelta
			}
		},
		expectedStatus: 'watch',
		expectedEvidenceSatisfied: true,
		expectedFindings: [
			{ kind: 'phase_coverage', severity: 'watch', metric: 'coverage' }
		]
	}
]

describe('offlineAnalysisReviewHelper semantic regressions', () => {
	it.each(calibrationScenarios)('$title', (scenario) => {
		const review = buildOfflineAnalysisReview(scenario.input)

		expect(review.status).toBe(scenario.expectedStatus)
		expect(review.evidence.sufficient).toBe(scenario.expectedEvidenceSatisfied)
		for (const expected of scenario.expectedFindings ?? []) {
			expectFinding(review.findings, expected)
		}
		for (const forbidden of scenario.forbiddenFindings ?? []) {
			expectNoFinding(review.findings, forbidden)
		}
	})
})
