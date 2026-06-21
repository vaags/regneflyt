import { describe, expect, it } from 'vitest'
import {
	defaultMatrixSeeds,
	parseOfflineAnalysisCliArgs,
	summarizePhaseCoverage,
	summarizePhaseDelta
} from '$lib/helpers/analysis/offlineAnalysisCliHelper'

describe('offlineAnalysisCliHelper', () => {
	it('parses default CLI options', () => {
		const options = parseOfflineAnalysisCliArgs([])

		expect(options.seeds).toEqual(defaultMatrixSeeds)
		expect(options.compare).toBe(false)
		expect(options.matrix).toBe(false)
		expect(options.review).toBe(false)
		expect(options.scope).toBe('narrow')
	})

	it('parses matrix mode and normalizes steps', () => {
		const options = parseOfflineAnalysisCliArgs([
			'--matrix',
			'--steps',
			'2.8',
			'--operators',
			'addition,subtraction,addition',
			'--seeds',
			'1,42'
		])

		expect(options.matrix).toBe(true)
		expect(options.compare).toBe(true)
		expect(options.steps).toBe(2)
		expect(options.operators).toEqual(['addition', 'subtraction'])
		expect(options.seeds).toEqual([1, 42])
	})

	it('rejects unknown operators', () => {
		expect(() => parseOfflineAnalysisCliArgs(['--operators', 'foo'])).toThrow(
			'Unknown operator(s) in --operators foo'
		)
	})

	it('rejects flags that are missing required values', () => {
		expect(() => parseOfflineAnalysisCliArgs(['--scope'])).toThrow(
			'Missing value for --scope'
		)
	})

	it('rejects unknown scopes', () => {
		expect(() =>
			parseOfflineAnalysisCliArgs(['--scope', 'invalid-scope'])
		).toThrow('Unknown --scope value invalid-scope')
	})

	it('rejects invalid seed and seed list values', () => {
		expect(() => parseOfflineAnalysisCliArgs(['--seed', 'nan-seed'])).toThrow(
			'Invalid --seed value nan-seed'
		)
		expect(() => parseOfflineAnalysisCliArgs(['--seeds', '1,foo'])).toThrow(
			'Invalid --seeds value 1,foo'
		)
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
})
