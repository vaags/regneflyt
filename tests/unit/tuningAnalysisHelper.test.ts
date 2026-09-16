import { describe, expect, it } from 'vitest'
import { adaptiveTuning } from '#lib/domain/skill-progression/adaptiveTuning.ts'
import {
	createTuningAnalysisArtifact,
	loadTuningSnapshot
} from '#lib/helpers/analysis/tuningAnalysisHelper.ts'
import { formatTuningAnalysisArtifact } from '#lib/helpers/analysis/tuningAnalysisFormatHelper.ts'
import type { TuningAnalysisConfig } from '#lib/helpers/analysis/tuningAnalysisTypes.ts'

function config(
	override: Partial<TuningAnalysisConfig> = {}
): TuningAnalysisConfig {
	return {
		seeds: [1, 42, 99],
		operators: ['addition', 'subtraction', 'multiplication', 'division', 'all'],
		steps: 100,
		accuracy: 0.7,
		responseSeconds: 3,
		startingSkills: [40, 40, 40, 40],
		...override
	}
}

function comparison(
	candidate: typeof adaptiveTuning,
	override: Partial<TuningAnalysisConfig> = {}
) {
	const artifact = createTuningAnalysisArtifact({
		config: config(override),
		baseline: adaptiveTuning,
		candidate,
		inputs: { baseline: 'base.json', candidate: 'candidate.json' },
		generatedAt: new Date('2026-09-14T12:00:00.000Z')
	})
	if (artifact.mode !== 'comparison') throw new Error('Expected comparison')
	return artifact
}

describe('tuningAnalysisHelper', () => {
	it('separates dedicated progression from all-operator interaction', () => {
		const artifact = createTuningAnalysisArtifact({
			config: config(),
			tuning: adaptiveTuning,
			inputs: {},
			generatedAt: new Date('2026-09-14T12:00:00.000Z')
		})
		if (artifact.mode !== 'standalone') throw new Error('Expected standalone')

		expect(artifact.summary.dedicated.map((value) => value.operator)).toEqual([
			'addition',
			'subtraction',
			'multiplication',
			'division'
		])
		expect(artifact.summary.dedicated[0]).toMatchObject({
			startingSkill: 40,
			runs: 3,
			totalSteps: 300
		})
		expect(
			(artifact.summary.dedicated[0]?.totalCorrectAnswers ?? 0) +
				(artifact.summary.dedicated[0]?.totalIncorrectAnswers ?? 0)
		).toBe(300)
		expect(artifact.summary.allOperator?.operators).toHaveLength(4)
		expect(
			artifact.summary.allOperator?.operators.reduce(
				(total, value) => total + value.selectionShare,
				0
			)
		).toBeCloseTo(1, 3)
		expect(formatTuningAnalysisArtifact(artifact)).toContain(
			'All-operator interaction'
		)
	})

	it('reports correct gains separately from incorrect penalties', () => {
		const artifact = createTuningAnalysisArtifact({
			config: config({ operators: ['addition'], steps: 200 }),
			tuning: adaptiveTuning,
			inputs: {},
			generatedAt: new Date('2026-09-14T12:00:00.000Z')
		})
		if (artifact.mode !== 'standalone') throw new Error('Expected standalone')
		const addition = artifact.summary.dedicated[0]

		expect(addition?.meanCorrectGain).toBeGreaterThan(0)
		expect(addition?.meanIncorrectPenalty).toBeGreaterThan(0)
		expect(addition?.totalCorrectAnswers).toBeGreaterThan(0)
		expect(addition?.totalIncorrectAnswers).toBeGreaterThan(0)
	})

	it('uses explicit eligibility for composition rates', () => {
		const artifact = createTuningAnalysisArtifact({
			config: config({
				operators: ['addition'],
				accuracy: 1,
				startingSkills: [60, 60, 60, 60]
			}),
			tuning: adaptiveTuning,
			inputs: {},
			generatedAt: new Date('2026-09-14T12:00:00.000Z')
		})
		if (artifact.mode !== 'standalone') throw new Error('Expected standalone')
		const composition = artifact.summary.dedicated[0]?.composition

		expect(composition?.normalMode.totalEligibleCount).toBe(300)
		expect(
			(composition?.normalMode.totalCount ?? 0) +
				(composition?.alternateMode.totalCount ?? 0) +
				(composition?.randomMode.totalCount ?? 0)
		).toBe(300)
		expect(composition?.negativeSubtraction).toEqual({
			totalCount: 0,
			totalEligibleCount: 0,
			rate: null
		})
		expect(composition?.carryOrBorrow.rate).not.toBeNull()
	})

	it('produces zero summary deltas for identical tuning', () => {
		const artifact = comparison(adaptiveTuning)

		expect(
			artifact.summary.delta.dedicated.every((value) => value.finalSkill === 0)
		).toBe(true)
		expect(artifact.summary.delta.allOperator?.finalSkills).toEqual([
			0, 0, 0, 0
		])
		expect(
			artifact.summary.delta.allOperator?.operators.every(
				(value) => value.selectionShare === 0
			)
		).toBe(true)
		for (const run of artifact.runs) {
			expect(run.baseline.answerSeed).toBe(run.candidate.answerSeed)
			expect(run.baseline.totalCorrectAnswers).toBe(
				run.candidate.totalCorrectAnswers
			)
		}
	})

	it('uses baseline phase thresholds for both comparison sides', () => {
		const artifact = comparison({
			...adaptiveTuning,
			calibration: {
				...adaptiveTuning.calibration,
				calibrationThreshold: 20,
				taperThreshold: 30
			}
		})

		expect(artifact.config.phaseThresholds).toEqual({
			calibration: 40,
			taper: 60
		})
	})

	it('embeds reproducible tuning snapshots and leaf-level comparison changes', () => {
		const candidate = {
			...adaptiveTuning,
			gains: {
				...adaptiveTuning.gains,
				baseSkillGain: 2,
				speedGainRange: [2, 4] as const
			}
		}
		const artifact = comparison(candidate, {
			operators: ['addition'],
			steps: 10
		})

		expect(artifact.schemaVersion).toBe(2)
		expect(artifact.tunings.baseline).toEqual(adaptiveTuning)
		expect(artifact.tunings.candidate).toEqual(candidate)
		expect(artifact.tunings.baseline).not.toBe(adaptiveTuning)
		expect(artifact.tuningChanges).toEqual([
			{
				path: 'gains.baseSkillGain',
				baseline: 0.9,
				candidate: 2
			},
			{
				path: 'gains.speedGainRange',
				baseline: [1.5, 3],
				candidate: [2, 4]
			}
		])
	})

	it('reports ceiling-clamped gains separately from difficulty blocking', () => {
		const ceilingTuning = {
			...adaptiveTuning,
			thresholds: {
				...adaptiveTuning.thresholds,
				minDifficultyRatio: 0
			}
		}
		const artifact = createTuningAnalysisArtifact({
			config: config({
				operators: ['addition'],
				steps: 5,
				accuracy: 1,
				startingSkills: [100, 100, 100, 100]
			}),
			tuning: ceilingTuning,
			inputs: {},
			generatedAt: new Date('2026-09-14T12:00:00.000Z')
		})
		if (artifact.mode !== 'standalone') throw new Error('Expected standalone')
		const addition = artifact.summary.dedicated[0]

		expect(artifact.schemaVersion).toBe(2)
		expect(artifact.tunings.standalone).toEqual(ceilingTuning)
		expect(addition?.totalCeilingClampedGains).toBe(15)
		expect(addition?.ceilingClampedGainRate).toBe(1)
		expect(addition?.totalBlockedGains).toBe(0)
	})

	it('reports floor-clamped penalties separately from realized penalties', () => {
		const highPenaltyTuning = {
			...adaptiveTuning,
			penalties: {
				...adaptiveTuning.penalties,
				basePenalty: 10,
				lowSkillPenaltyCapThreshold: 1
			}
		}
		const artifact = createTuningAnalysisArtifact({
			config: config({
				operators: ['addition'],
				steps: 1,
				accuracy: 0,
				startingSkills: [2, 2, 2, 2]
			}),
			tuning: highPenaltyTuning,
			inputs: {},
			generatedAt: new Date('2026-09-14T12:00:00.000Z')
		})
		if (artifact.mode !== 'standalone') throw new Error('Expected standalone')
		const addition = artifact.summary.dedicated[0]

		expect(addition?.meanIncorrectPenalty).toBe(2)
		expect(addition?.totalFloorClampedPenalties).toBe(3)
		expect(addition?.floorClampedPenaltyRate).toBe(1)
	})

	it('exposes representative gain and penalty changes directly', () => {
		const gain = comparison(
			{
				...adaptiveTuning,
				gains: { ...adaptiveTuning.gains, baseSkillGain: 2 }
			},
			{ operators: ['addition'], accuracy: 1, steps: 10 }
		)
		const penalty = comparison(
			{
				...adaptiveTuning,
				penalties: { ...adaptiveTuning.penalties, basePenalty: 5 }
			},
			{
				operators: ['addition'],
				accuracy: 0.4,
				startingSkills: [60, 60, 60, 60]
			}
		)

		expect(gain.summary.delta.dedicated[0]?.meanCorrectGain).not.toBe(0)
		expect(penalty.summary.delta.dedicated[0]?.meanIncorrectPenalty).not.toBe(0)
	})

	it('formats primary comparison metrics with baseline, candidate, and delta context', () => {
		const artifact = comparison(
			{
				...adaptiveTuning,
				gains: { ...adaptiveTuning.gains, baseSkillGain: 2 }
			},
			{ operators: ['addition'], accuracy: 1, steps: 10 }
		)
		const report = formatTuningAnalysisArtifact(artifact)

		expect(report).toContain('Baseline  Candidate      Delta')
		expect(report).toContain('Final skill')
		expect(report).toContain('Correct gain')
		expect(report).toContain('Incorrect penalty')
		expect(report).toContain('Ceiling-clamped rate')
		expect(report).toContain('Floor-clamped rate')
		expect(report).toContain('Cooldown difficulty')
		expect(report).toContain('Tuning changes: 1')
		expect(report).toContain('gains.baseSkillGain: 0.9 → 2')
		expect(report).toContain('  mid')
		expect(report).toContain('modes normal=')
		expect(report).not.toContain('Dedicated operator progression')
	})

	it('formats unavailable comparison composition rates as n/a', () => {
		const artifact = comparison(adaptiveTuning, {
			operators: ['addition'],
			steps: 10
		})
		const report = formatTuningAnalysisArtifact(artifact)

		expect(report).toContain('negative-sub=n/a')
		expect(report).toContain('unknown-divisor=n/a')
	})

	it('exposes operator mixing with uneven all-mode skills', () => {
		const artifact = comparison(
			{
				...adaptiveTuning,
				operatorMixing: {
					...adaptiveTuning.operatorMixing,
					skillGapDampingFactor: 1
				}
			},
			{
				operators: ['all'],
				startingSkills: [20, 50, 50, 50],
				steps: 300
			}
		)

		expect(
			artifact.summary.delta.allOperator?.operators.some(
				(value) => value.selectionShare !== 0
			)
		).toBe(true)
	})

	it('exposes puzzle-mode rollout changes in composition', () => {
		const artifact = comparison(
			{
				...adaptiveTuning,
				puzzleMode: {
					...adaptiveTuning.puzzleMode,
					randomMidpoint: 50
				}
			},
			{ operators: ['addition'], startingSkills: [60, 60, 60, 60], accuracy: 1 }
		)

		expect(
			artifact.summary.delta.dedicated[0]?.composition.randomMode
		).not.toBe(0)
	})

	it('exposes algebraic rollout changes in composition', () => {
		const negativeSubtraction = comparison(
			{
				...adaptiveTuning,
				algebraicRollout: {
					...adaptiveTuning.algebraicRollout,
					negativeSubStartSkill: 40,
					negativeSubFullSkill: 50
				}
			},
			{
				operators: ['subtraction'],
				startingSkills: [60, 60, 60, 60],
				steps: 100
			}
		)
		const unknownDivisor = comparison(
			{
				...adaptiveTuning,
				algebraicRollout: {
					...adaptiveTuning.algebraicRollout,
					divisorUnknownStartSkill: 40,
					divisorUnknownFullSkill: 50,
					divisorUnknownProbability: 0.8
				}
			},
			{
				operators: ['division'],
				startingSkills: [60, 60, 60, 60],
				steps: 100
			}
		)

		expect(
			negativeSubtraction.summary.delta.dedicated[0]?.composition
				.negativeSubtraction
		).not.toBe(0)
		expect(
			unknownDivisor.summary.delta.dedicated[0]?.composition.unknownDivisor
		).not.toBe(0)
	})

	it('validates structural and semantic tuning constraints with source paths', () => {
		expect(loadTuningSnapshot(adaptiveTuning)).toEqual(adaptiveTuning)
		expect(() =>
			loadTuningSnapshot(
				{
					...adaptiveTuning,
					gains: { ...adaptiveTuning.gains, baseSkillGain: 'invalid' }
				},
				'candidate.json'
			)
		).toThrow(/candidate\.json.*gains\.baseSkillGain/)
		expect(() =>
			loadTuningSnapshot(
				{
					...adaptiveTuning,
					calibration: {
						...adaptiveTuning.calibration,
						calibrationThreshold: 70,
						taperThreshold: 60
					}
				},
				'candidate.json'
			)
		).toThrow(/candidate\.json.*zones must not overlap/)
	})
})
