import { describe, expect, it } from 'vitest'
import { OperatorExtended } from '$lib/constants/Operator'
import {
	adaptiveTuning,
	defaultAdaptiveSkillMap,
	type AdaptiveSkillMap
} from '$lib/models/AdaptiveProfile'
import {
	createDefaultOfflineScenario,
	createOfflineAnalysisRecommendation,
	compareOfflineAnalysisResults,
	formatOfflineAnalysisRecommendation,
	formatOfflineAnalysisReport,
	loadTuningSnapshot,
	runOfflineAnalysis,
	type OfflineAnalysisScenario
} from '$lib/helpers/analysis/offlineAnalysisHelper'

describe('offlineAnalysisHelper', () => {
	it('creates a deterministic default scenario', () => {
		const scenario = createDefaultOfflineScenario()

		expect(scenario.operator).toBe(OperatorExtended.All)
		expect(scenario.startingSkills).toEqual(defaultAdaptiveSkillMap)
	})

	it('runs a deterministic analysis and formats a report', () => {
		const startingSkills: AdaptiveSkillMap = [10, 20, 30, 40]
		const scenario: OfflineAnalysisScenario = {
			title: 'test-scenario',
			operator: OperatorExtended.All,
			steps: 3,
			responseSpeed: 3,
			correctnessMode: 'correct',
			mixedAccuracy: 1,
			seed: 123,
			startingSkills,
			tuning: adaptiveTuning
		}

		const resultA = runOfflineAnalysis(scenario)
		const resultB = runOfflineAnalysis(scenario)

		expect(resultA.steps).toBe(3)
		expect(resultA.correctCount).toBe(3)
		expect(resultA.incorrectCount).toBe(0)
		expect(
			resultA.phaseSummaries.early.steps +
				resultA.phaseSummaries.mid.steps +
				resultA.phaseSummaries.late.steps
		).toBe(3)
		expect(resultA.phaseSummaries.early.steps).toBeGreaterThan(0)
		expect(resultA.finalSkills).toEqual(resultB.finalSkills)
		expect(formatOfflineAnalysisReport(resultA)).toContain(
			'Scenario: test-scenario'
		)
	})

	it('loads tuning overrides and compares analysis runs', () => {
		const candidateTuning = {
			...adaptiveTuning,
			skillBounds: {
				...adaptiveTuning.skillBounds,
				maxSkill: 80
			}
		}
		const baselineScenario: OfflineAnalysisScenario = {
			title: 'baseline',
			operator: OperatorExtended.All,
			steps: 2,
			responseSpeed: 3,
			correctnessMode: 'correct',
			mixedAccuracy: 1,
			seed: 7,
			startingSkills: [0, 0, 0, 0],
			tuning: loadTuningSnapshot(adaptiveTuning)
		}
		const candidateScenario: OfflineAnalysisScenario = {
			...baselineScenario,
			title: 'candidate',
			tuning: loadTuningSnapshot(candidateTuning)
		}

		const baseline = runOfflineAnalysis(baselineScenario)
		const candidate = runOfflineAnalysis(candidateScenario)
		const comparison = compareOfflineAnalysisResults(baseline, candidate)

		expect(comparison.delta.correctCount).toBe(0)
		expect(comparison.delta.incorrectCount).toBe(0)
		expect(comparison.delta.finalSkills).toHaveLength(4)
		expect(comparison.phaseDelta.early.steps).toBe(0)
		expect(comparison.phaseDelta.mid.steps).toBe(0)
		expect(comparison.phaseDelta.late.steps).toBe(0)
	})

	it('classifies strong review outcomes as pass', () => {
		const recommendation = createOfflineAnalysisRecommendation({
			correctCountDelta: 2,
			meanSkillDelta: 0.2
		})

		expect(recommendation.verdict).toBe('pass')
		expect(recommendation.reason).toBe('favorable')
		expect(formatOfflineAnalysisRecommendation(recommendation)).toContain(
			'Verdict: pass'
		)
	})

	it('classifies small tradeoffs as warn', () => {
		const recommendation = createOfflineAnalysisRecommendation({
			correctCountDelta: -1,
			meanSkillDelta: 0.05
		})

		expect(recommendation.verdict).toBe('warn')
	})

	it('classifies larger regressions as fail', () => {
		const recommendation = createOfflineAnalysisRecommendation({
			correctCountDelta: -4,
			meanSkillDelta: 0.2
		})

		expect(recommendation.verdict).toBe('fail')
	})

	it('warns when a phase regresses despite favorable aggregate deltas', () => {
		const recommendation = createOfflineAnalysisRecommendation({
			correctCountDelta: 2,
			meanSkillDelta: 0.2,
			reviewedStepCount: 100,
			phaseCoverage: {
				early: 40,
				mid: 30,
				late: 30
			},
			phaseDelta: {
				early: {
					steps: 0,
					correctCount: 0,
					incorrectCount: 0,
					meanSkillDelta: 0
				},
				mid: {
					steps: 2,
					correctCount: -1,
					incorrectCount: 1,
					meanSkillDelta: -0.01
				},
				late: {
					steps: 0,
					correctCount: 0,
					incorrectCount: 0,
					meanSkillDelta: 0
				}
			}
		})

		expect(recommendation.verdict).toBe('warn')
		expect(recommendation.reason).toBe('phase_warning')
		expect(recommendation.phaseWarnings).toEqual(['mid'])
	})

	it('surfaces suppressed warnings for low-sample phase regressions', () => {
		const recommendation = createOfflineAnalysisRecommendation({
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
		})

		expect(recommendation.phaseWarnings).toEqual([])
		expect(recommendation.suppressedWarnings).toEqual([
			{
				kind: 'phase_warning',
				phase: 'late',
				reason: 'coverage_below_threshold'
			}
		])
	})

	it('rejects partial phase metadata when coverage is missing', () => {
		const partialInput: unknown = {
			correctCountDelta: 1,
			meanSkillDelta: 0.1,
			reviewedStepCount: 100,
			phaseDelta: {
				early: {
					steps: 1,
					correctCount: -1,
					incorrectCount: 1,
					meanSkillDelta: -0.01
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
			}
		}

		expect(() =>
			createOfflineAnalysisRecommendation(
				partialInput as Parameters<
					typeof createOfflineAnalysisRecommendation
				>[0]
			)
		).toThrow(/phaseDelta and phaseCoverage to be provided together/i)
	})

	it('rejects partial phase metadata when delta is missing', () => {
		const partialInput: unknown = {
			correctCountDelta: 1,
			meanSkillDelta: 0.1,
			reviewedStepCount: 100,
			phaseCoverage: {
				early: 30,
				mid: 30,
				late: 30
			}
		}

		expect(() =>
			createOfflineAnalysisRecommendation(
				partialInput as Parameters<
					typeof createOfflineAnalysisRecommendation
				>[0]
			)
		).toThrow(/phaseDelta and phaseCoverage to be provided together/i)
	})

	it('rejects incomplete tuning snapshots', () => {
		expect(() =>
			loadTuningSnapshot({
				skillBounds: {
					minSkill: 0,
					maxSkill: 80
				}
			})
		).toThrow(/Invalid tuning snapshot/i)
	})

	it('rejects non-finite tuning values', () => {
		expect(() =>
			loadTuningSnapshot({
				...adaptiveTuning,
				penalties: {
					...adaptiveTuning.penalties,
					basePenalty: Number.POSITIVE_INFINITY
				}
			})
		).toThrow(/Invalid tuning snapshot/i)
	})

	it('rejects snapshots with unexpected fields', () => {
		expect(() =>
			loadTuningSnapshot({
				...adaptiveTuning,
				unknownField: 123
			})
		).toThrow(/Invalid tuning snapshot/i)
	})
})
