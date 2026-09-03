import { describe, expect, it } from 'vitest'
import { OperatorExtended } from '#lib/constants/Operator.ts'
import {
	adaptiveTuning,
	defaultAdaptiveSkillMap,
	type AdaptiveSkillMap
} from '#lib/models/AdaptiveProfile.ts'
import {
	createDefaultOfflineScenario,
	compareOfflineAnalysisResults,
	formatOfflineAnalysisReport,
	loadTuningSnapshot,
	runOfflineAnalysis,
	summarizePhaseCoverage,
	summarizePhaseDelta,
	type OfflineAnalysisScenario
} from '#lib/helpers/analysis/offlineAnalysisHelper.ts'

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

	it('summarizes phase coverage with conservative minimums', () => {
		const summary = summarizePhaseCoverage([
			{
				phaseCoverage: { early: 10, mid: 8, late: 5 },
				phaseDelta: {
					early: {
						steps: 1,
						correctCount: 1,
						incorrectCount: 0,
						meanSkillDelta: 0.1
					},
					mid: {
						steps: 2,
						correctCount: 1,
						incorrectCount: 1,
						meanSkillDelta: 0.05
					},
					late: {
						steps: 3,
						correctCount: 2,
						incorrectCount: 1,
						meanSkillDelta: 0.02
					}
				}
			},
			{
				phaseCoverage: { early: 9, mid: 9, late: 4 },
				phaseDelta: {
					early: {
						steps: 2,
						correctCount: 2,
						incorrectCount: 0,
						meanSkillDelta: 0.2
					},
					mid: {
						steps: 3,
						correctCount: 2,
						incorrectCount: 1,
						meanSkillDelta: 0.03
					},
					late: {
						steps: 4,
						correctCount: 3,
						incorrectCount: 1,
						meanSkillDelta: 0.01
					}
				}
			}
		])

		expect(summary).toEqual({ early: 9, mid: 8, late: 4 })
	})

	it('summarizes phase deltas by averaging each phase metric', () => {
		const summary = summarizePhaseDelta([
			{
				phaseCoverage: { early: 10, mid: 8, late: 5 },
				phaseDelta: {
					early: {
						steps: 4,
						correctCount: 2,
						incorrectCount: 2,
						meanSkillDelta: 0.1
					},
					mid: {
						steps: 6,
						correctCount: 3,
						incorrectCount: 3,
						meanSkillDelta: 0.02
					},
					late: {
						steps: 8,
						correctCount: 4,
						incorrectCount: 4,
						meanSkillDelta: -0.01
					}
				}
			},
			{
				phaseCoverage: { early: 9, mid: 9, late: 4 },
				phaseDelta: {
					early: {
						steps: 2,
						correctCount: 1,
						incorrectCount: 1,
						meanSkillDelta: 0.2
					},
					mid: {
						steps: 4,
						correctCount: 2,
						incorrectCount: 2,
						meanSkillDelta: 0.04
					},
					late: {
						steps: 6,
						correctCount: 3,
						incorrectCount: 3,
						meanSkillDelta: -0.03
					}
				}
			}
		])

		expect(summary.early).toEqual({
			steps: 3,
			correctCount: 1.5,
			incorrectCount: 1.5,
			meanSkillDelta: 0.15
		})
		expect(summary.mid).toEqual({
			steps: 5,
			correctCount: 2.5,
			incorrectCount: 2.5,
			meanSkillDelta: 0.03
		})
		expect(summary.late).toEqual({
			steps: 7,
			correctCount: 3.5,
			incorrectCount: 3.5,
			meanSkillDelta: -0.02
		})
	})

	describe('loadTuningSnapshot', () => {
		it('accepts a full snapshot of the current tuning shape', () => {
			const serialized = JSON.parse(JSON.stringify(adaptiveTuning)) as unknown

			expect(loadTuningSnapshot(serialized)).toEqual(adaptiveTuning)
		})

		it('rejects a knob that is missing from the snapshot', () => {
			const gains: Partial<typeof adaptiveTuning.gains> = {
				...adaptiveTuning.gains
			}
			delete gains.baseSkillGain

			expect(() => loadTuningSnapshot({ ...adaptiveTuning, gains })).toThrow(
				/gains\.baseSkillGain/
			)
		})

		it('rejects unknown knobs and unknown groups', () => {
			const extraKnob = {
				...adaptiveTuning,
				skillBounds: { ...adaptiveTuning.skillBounds, unexpectedKnob: 1 }
			}
			const extraGroup = { ...adaptiveTuning, unexpectedGroup: { foo: 1 } }

			expect(() => loadTuningSnapshot(extraKnob)).toThrow(/unexpectedKnob/)
			expect(() => loadTuningSnapshot(extraGroup)).toThrow(/unexpectedGroup/)
		})

		it('rejects malformed knob values', () => {
			const wrongType = {
				...adaptiveTuning,
				skillBounds: { ...adaptiveTuning.skillBounds, maxSkill: 'nope' }
			}
			const truncatedPair = {
				...adaptiveTuning,
				gains: { ...adaptiveTuning.gains, speedGainRange: [1.5] }
			}

			expect(() => loadTuningSnapshot(wrongType)).toThrow(
				/skillBounds\.maxSkill/
			)
			expect(() => loadTuningSnapshot(truncatedPair)).toThrow(
				/gains\.speedGainRange/
			)
		})
	})
})
