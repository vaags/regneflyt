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

	it('rejects legacy snapshots with removed remediation tuning', () => {
		expect(() =>
			loadTuningSnapshot({
				...adaptiveTuning,
				remediation: {
					thresholdAccuracy: 0.6,
					minPuzzles: 3,
					slowResponseSeconds: 1.5,
					fastLowAccuracyMinPuzzles: 5
				}
			})
		).toThrow(/Invalid tuning snapshot/i)
	})

	it('detects phase compression pattern and returns pass verdict', () => {
		// Phase compression: earlier phase exits faster with better efficiency, later phases OK
		const recommendation = createOfflineAnalysisRecommendation({
			correctCountDelta: 1,
			meanSkillDelta: 0.15,
			reviewedStepCount: 100,
			phaseCoverage: {
				early: 30,
				mid: 35,
				late: 35
			},
			phaseDelta: {
				early: {
					steps: -13.67, // Earlier exit (fewer steps)
					correctCount: -3.1, // Slight regression in count
					incorrectCount: 3.1,
					meanSkillDelta: 0.47 // But much higher skill/step (+470%)
				},
				mid: {
					steps: 3.27,
					correctCount: 7.27, // Improves
					incorrectCount: -4.0,
					meanSkillDelta: 0.076 // Improves
				},
				late: {
					steps: 10.4,
					correctCount: 2.6, // Still improves
					incorrectCount: -2.6,
					meanSkillDelta: -0.02 // Minor decline but >= -0.05
				}
			}
		})

		expect(recommendation.verdict).toBe('pass')
		expect(recommendation.kind).toBe('change_detected')
		expect(recommendation.severity).toBe('info')
		expect(recommendation.reason).toBe('phase_acceleration_expected')
		expect(recommendation.phaseAccelerationSignal).toBeDefined()
		expect(formatOfflineAnalysisRecommendation(recommendation)).toContain(
			'Phase Acceleration Signal'
		)
	})

	it('adds kind and severity fields to all verdict types', () => {
		// Test favorable verdict
		const favorable = createOfflineAnalysisRecommendation({
			correctCountDelta: 5,
			meanSkillDelta: 0.2
		})
		expect(favorable.kind).toBeDefined()
		expect(favorable.severity).toBeDefined()
		expect(typeof favorable.kind).toBe('string')
		expect(typeof favorable.severity).toBe('string')

		// Test warn verdict
		const warn = createOfflineAnalysisRecommendation({
			correctCountDelta: -1,
			meanSkillDelta: 0.05
		})
		expect(warn.kind).toBeDefined()
		expect(warn.severity).toBeDefined()

		// Test fail verdict
		const fail = createOfflineAnalysisRecommendation({
			correctCountDelta: -10,
			meanSkillDelta: -0.1
		})
		expect(fail.kind).toBeDefined()
		expect(fail.severity).toBeDefined()
	})

	it('derives backward-compatible verdict field from kind and severity', () => {
		// change_detected + info → pass
		const pass = createOfflineAnalysisRecommendation({
			correctCountDelta: 2,
			meanSkillDelta: 0.1
		})
		expect(pass.kind).toBe('change_detected')
		expect(pass.severity).toBe('info')
		expect(pass.verdict).toBe('pass')

		// change_detected + warn → warn
		const warn = createOfflineAnalysisRecommendation({
			correctCountDelta: -1,
			meanSkillDelta: 0.05
		})
		expect(warn.kind).toBe('change_detected')
		expect(warn.severity).toBe('warn')
		expect(warn.verdict).toBe('warn')

		// issue_detected + any → fail
		const fail = createOfflineAnalysisRecommendation({
			correctCountDelta: -10,
			meanSkillDelta: -0.2
		})
		expect(fail.kind).toBe('issue_detected')
		expect(fail.verdict).toBe('fail')
	})

	it('rejects phase compression if later phases regress', () => {
		// Same compression pattern, but later phases regress
		const recommendation = createOfflineAnalysisRecommendation({
			correctCountDelta: 1,
			meanSkillDelta: 0.1,
			reviewedStepCount: 100,
			phaseCoverage: {
				early: 30,
				mid: 35,
				late: 35
			},
			phaseDelta: {
				early: {
					steps: -13.67, // Earlier exit
					correctCount: -3.1,
					incorrectCount: 3.1,
					meanSkillDelta: 0.47 // High efficiency
				},
				mid: {
					steps: 3.27,
					correctCount: -5.0, // Mid phase REGRESSES
					incorrectCount: 5.0,
					meanSkillDelta: -0.15 // Skill regresses
				},
				late: {
					steps: 10.4,
					correctCount: 2.6,
					incorrectCount: -2.6,
					meanSkillDelta: -0.1
				}
			}
		})

		// Should be FAIL, not pass, because mid phase regresses
		expect(recommendation.verdict).toBe('fail')
		expect(recommendation.reason).not.toBe('phase_acceleration_expected')
	})

	it('computes phase acceleration percent from baseline phase efficiency', () => {
		const recommendation = createOfflineAnalysisRecommendation({
			correctCountDelta: 1,
			meanSkillDelta: 0.15,
			reviewedStepCount: 100,
			phaseCoverage: {
				early: 30,
				mid: 35,
				late: 35
			},
			phaseEfficiencyBaseline: {
				early: 0.1,
				mid: 0.07,
				late: 0.05
			},
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
					incorrectCount: -4.0,
					meanSkillDelta: 0.076
				},
				late: {
					steps: 10.4,
					correctCount: 2.6,
					incorrectCount: -2.6,
					meanSkillDelta: -0.02
				}
			}
		})

		expect(recommendation.verdict).toBe('pass')
		expect(recommendation.phaseAccelerationSignal).toMatchObject({
			acceleratedPhase: 'early',
			skillGainDeltaAbsolute: 0.47,
			skillGainDeltaPercent: 470
		})
		expect(formatOfflineAnalysisRecommendation(recommendation)).toContain(
			'Skill Gain Improvement: +470%'
		)
	})

	it('falls back to absolute efficiency delta when no baseline is provided', () => {
		const recommendation = createOfflineAnalysisRecommendation({
			correctCountDelta: 1,
			meanSkillDelta: 0.15,
			reviewedStepCount: 100,
			phaseCoverage: {
				early: 30,
				mid: 35,
				late: 35
			},
			phaseDelta: {
				early: {
					steps: -10,
					correctCount: 0,
					incorrectCount: 0,
					meanSkillDelta: 0.2
				},
				mid: {
					steps: 5,
					correctCount: 2,
					incorrectCount: -2,
					meanSkillDelta: 0.03
				},
				late: {
					steps: 5,
					correctCount: 1,
					incorrectCount: -1,
					meanSkillDelta: 0
				}
			}
		})

		expect(recommendation.verdict).toBe('pass')
		expect(recommendation.phaseAccelerationSignal).toMatchObject({
			skillGainDeltaAbsolute: 0.2
		})
		expect(recommendation.phaseAccelerationSignal).not.toHaveProperty(
			'skillGainDeltaPercent'
		)

		const formatted = formatOfflineAnalysisRecommendation(recommendation)
		expect(formatted).toContain('Absolute Skill Gain Delta: +0.2000')
		expect(formatted).not.toContain('Skill Gain Improvement: +')
	})

	it('uses coverage-normalized threshold for later-phase correctness regression', () => {
		const recommendation = createOfflineAnalysisRecommendation({
			correctCountDelta: 1,
			meanSkillDelta: 0.12,
			reviewedStepCount: 100,
			phaseCoverage: {
				early: 35,
				mid: 20,
				late: 45
			},
			phaseDelta: {
				early: {
					steps: -12,
					correctCount: -2,
					incorrectCount: 2,
					meanSkillDelta: 0.3
				},
				mid: {
					steps: 4,
					correctCount: -1,
					incorrectCount: 1,
					meanSkillDelta: 0.01
				},
				late: {
					steps: 8,
					correctCount: 2,
					incorrectCount: -2,
					meanSkillDelta: 0
				}
			}
		})

		// mid correctness regression rate is -1/20 = -0.05, below the allowed -0.02 threshold
		expect(recommendation.verdict).toBe('fail')
		expect(recommendation.reason).not.toBe('phase_acceleration_expected')
	})

	it('uses mixed downstream tolerance when some phases are missing coverage signals', () => {
		const recommendation = createOfflineAnalysisRecommendation({
			correctCountDelta: 1,
			meanSkillDelta: 0.12,
			reviewedStepCount: 100,
			phaseCoverage: {
				early: 35,
				mid: 25
			},
			phaseDelta: {
				early: {
					steps: -10,
					correctCount: 0,
					incorrectCount: 0,
					meanSkillDelta: 0.2
				},
				mid: {
					steps: 6,
					correctCount: -0.6,
					incorrectCount: 0.6,
					meanSkillDelta: 0.01
				},
				late: {
					steps: 4,
					correctCount: -0.5,
					incorrectCount: 0.5,
					meanSkillDelta: 0
				}
			}
		})

		// Mid has coverage and fails rate check: -0.6/25 = -0.024 < -0.02.
		// Late has no coverage signal and would pass absolute fallback: -0.5 >= -1.
		expect(recommendation.verdict).toBe('warn')
		expect(recommendation.reason).toBe('phase_warning')
		expect(recommendation.phaseWarnings).toEqual(['mid'])
	})

	it('downgrades phase compression to warn when advisoryOnly (compare-only) evidence', () => {
		// Phase compression with compare-only evidence (advisoryOnly=true) should not pass
		const recommendation = createOfflineAnalysisRecommendation({
			correctCountDelta: 1,
			meanSkillDelta: 0.15,
			reviewedStepCount: 100,
			evidenceClass: 'compare',
			changeScope: 'foundational',
			phaseCoverage: {
				early: 30,
				mid: 35,
				late: 35
			},
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
					incorrectCount: -4.0,
					meanSkillDelta: 0.076
				},
				late: {
					steps: 10.4,
					correctCount: 2.6,
					incorrectCount: -2.6,
					meanSkillDelta: -0.02
				}
			}
		})

		// Should be warn because advisory-only (compare evidence) requires matrix for broad changes
		expect(recommendation.verdict).toBe('warn')
		expect(recommendation.reason).toBe('advisory_only')
		expect(recommendation.severity).toBe('warn')
		expect(recommendation.rationale).toContain(
			'broader tuning changes require matrix evidence'
		)
	})
})
