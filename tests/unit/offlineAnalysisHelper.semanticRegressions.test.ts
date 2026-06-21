import { describe, expect, it } from 'vitest'
import {
	createOfflineAnalysisRecommendation,
	type OfflineAnalysisRecommendationReason,
	type StrictOfflineAnalysisRecommendationInput
} from '$lib/helpers/analysis/offlineAnalysisHelper'

type CalibrationScenario = {
	title: string
	input: StrictOfflineAnalysisRecommendationInput
	expectedVerdict: 'pass' | 'warn' | 'fail'
	expectedReason: OfflineAnalysisRecommendationReason
	expectedPolicySatisfied: boolean
	expectedPhaseWarnings?: string[]
}

const calibrationScenarios: CalibrationScenario[] = [
	{
		title: 'safe narrow compare change stays pass',
		input: {
			correctCountDelta: 2,
			meanSkillDelta: 0.2,
			evidenceClass: 'compare',
			changeScope: 'narrow',
			reviewedStepCount: 100
		},
		expectedVerdict: 'pass',
		expectedReason: 'favorable',
		expectedPolicySatisfied: true
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
		expectedVerdict: 'warn',
		expectedReason: 'advisory_only',
		expectedPolicySatisfied: false
	},
	{
		title: 'foundational matrix change can pass',
		input: {
			correctCountDelta: 2,
			meanSkillDelta: 0.2,
			evidenceClass: 'matrix',
			changeScope: 'foundational',
			reviewedStepCount: 100
		},
		expectedVerdict: 'pass',
		expectedReason: 'favorable',
		expectedPolicySatisfied: true
	},
	{
		title: 'broad regression with imbalance fails',
		input: {
			correctCountDelta: -4,
			meanSkillDelta: 0.2,
			operatorImbalance: true,
			evidenceClass: 'matrix',
			changeScope: 'broad',
			reviewedStepCount: 100
		},
		expectedVerdict: 'fail',
		expectedReason: 'operator_imbalance',
		expectedPolicySatisfied: true
	},
	{
		title: 'equivalent proportional regression at 50 steps remains warning',
		input: {
			correctCountDelta: -1,
			meanSkillDelta: 0,
			evidenceClass: 'compare',
			changeScope: 'narrow',
			reviewedStepCount: 50
		},
		expectedVerdict: 'warn',
		expectedReason: 'aggregate_regression',
		expectedPolicySatisfied: true
	},
	{
		title: 'equivalent proportional regression at 100 steps remains warning',
		input: {
			correctCountDelta: -2,
			meanSkillDelta: 0,
			evidenceClass: 'compare',
			changeScope: 'narrow',
			reviewedStepCount: 100
		},
		expectedVerdict: 'warn',
		expectedReason: 'aggregate_regression',
		expectedPolicySatisfied: true
	},
	{
		title: 'low-sample late regression is ignored for phase warnings',
		input: {
			correctCountDelta: 1,
			meanSkillDelta: 0.15,
			evidenceClass: 'matrix',
			changeScope: 'broad',
			reviewedStepCount: 100,
			phaseCoverage: {
				early: 45,
				mid: 44,
				late: 8
			},
			phaseDelta: {
				early: {
					steps: 2,
					correctCount: 1,
					incorrectCount: -1,
					meanSkillDelta: 0.05
				},
				mid: {
					steps: 3,
					correctCount: 0,
					incorrectCount: 0,
					meanSkillDelta: 0.02
				},
				late: {
					steps: 2,
					correctCount: -1,
					incorrectCount: 1,
					meanSkillDelta: -0.01
				}
			}
		},
		expectedVerdict: 'pass',
		expectedReason: 'favorable',
		expectedPolicySatisfied: true,
		expectedPhaseWarnings: []
	},
	{
		title: 'sufficient-sample late regression still triggers warning',
		input: {
			correctCountDelta: 1,
			meanSkillDelta: 0.15,
			evidenceClass: 'matrix',
			changeScope: 'broad',
			reviewedStepCount: 100,
			phaseCoverage: {
				early: 45,
				mid: 44,
				late: 24
			},
			phaseDelta: {
				early: {
					steps: 2,
					correctCount: 1,
					incorrectCount: -1,
					meanSkillDelta: 0.05
				},
				mid: {
					steps: 3,
					correctCount: 0,
					incorrectCount: 0,
					meanSkillDelta: 0.02
				},
				late: {
					steps: 2,
					correctCount: -1,
					incorrectCount: 1,
					meanSkillDelta: -0.01
				}
			}
		},
		expectedVerdict: 'warn',
		expectedReason: 'phase_warning',
		expectedPolicySatisfied: true,
		expectedPhaseWarnings: ['late']
	},
	{
		title:
			'matrix mixed sparsity keeps phase warnings suppressed with conservative minimum coverage',
		input: {
			correctCountDelta: 1,
			meanSkillDelta: 0.15,
			evidenceClass: 'matrix',
			changeScope: 'broad',
			reviewedStepCount: 100,
			phaseCoverage: {
				early: 6,
				mid: 45,
				late: 44
			},
			phaseDelta: {
				early: {
					steps: 2,
					correctCount: -1,
					incorrectCount: 1,
					meanSkillDelta: -0.01
				},
				mid: {
					steps: 3,
					correctCount: 0,
					incorrectCount: 0,
					meanSkillDelta: 0.02
				},
				late: {
					steps: 1,
					correctCount: 0,
					incorrectCount: 0,
					meanSkillDelta: 0
				}
			}
		},
		expectedVerdict: 'pass',
		expectedReason: 'favorable',
		expectedPolicySatisfied: true,
		expectedPhaseWarnings: []
	}
]

describe('offlineAnalysisHelper semantic regressions', () => {
	it.each(calibrationScenarios)('$title', (scenario) => {
		const recommendation = createOfflineAnalysisRecommendation(scenario.input)

		expect(recommendation.verdict).toBe(scenario.expectedVerdict)
		expect(recommendation.reason).toBe(scenario.expectedReason)
		expect(recommendation.policy.broadChangePolicySatisfied).toBe(
			scenario.expectedPolicySatisfied
		)
		expect(recommendation.phaseWarnings).toEqual(
			scenario.expectedPhaseWarnings ?? []
		)
	})
})
