import { describe, expect, it } from 'vitest'
import { OperatorExtended } from '#lib/domain/arithmetic/operator.ts'
import { adaptiveTuning } from '#lib/domain/skill-progression/adaptiveTuning.ts'
import {
	deriveAnswerSeed,
	runTuningSimulation
} from '#lib/helpers/analysis/tuningAnalysisRunner.ts'

const baseConfig = {
	tuning: adaptiveTuning,
	startingSkills: [0, 0, 0, 0] as [number, number, number, number],
	operator: OperatorExtended.All,
	steps: 40,
	accuracy: 0.7,
	responseSeconds: 3,
	puzzleSeed: 42,
	answerSeed: deriveAnswerSeed(42)
}

describe('tuningAnalysisRunner', () => {
	it('produces deterministic runs', () => {
		expect(runTuningSimulation(baseConfig)).toEqual(
			runTuningSimulation(baseConfig)
		)
	})

	it('keeps answer outcomes independent from puzzle seed consumption', () => {
		const addition = runTuningSimulation({
			...baseConfig,
			operator: OperatorExtended.Addition
		})
		const allOperators = runTuningSimulation(baseConfig)

		expect(addition.map((step) => step.isCorrect)).toEqual(
			allOperators.map((step) => step.isCorrect)
		)
		expect(addition.map((step) => step.difficulty)).not.toEqual(
			allOperators.map((step) => step.difficulty)
		)
	})

	it('records challenge and blocked-gain metrics from skill updates', () => {
		const strictDifficultyTuning = {
			...adaptiveTuning,
			thresholds: {
				...adaptiveTuning.thresholds,
				minDifficultyRatio: 1
			}
		}
		const steps = runTuningSimulation({
			...baseConfig,
			tuning: strictDifficultyTuning,
			startingSkills: [80, 80, 80, 80],
			operator: OperatorExtended.Addition,
			accuracy: 1
		})

		expect(steps.every((step) => step.difficultyRatio >= 0)).toBe(true)
		expect(steps.every((step) => step.difficultyRatio <= 1)).toBe(true)
		expect(steps.some((step) => step.difficultyGateBlocked)).toBe(true)
	})

	it('distinguishes skill-ceiling truncation from difficulty-gate blocking', () => {
		const ceilingTuning = {
			...adaptiveTuning,
			thresholds: {
				...adaptiveTuning.thresholds,
				minDifficultyRatio: 0
			}
		}
		const steps = runTuningSimulation({
			...baseConfig,
			tuning: ceilingTuning,
			startingSkills: [100, 100, 100, 100],
			operator: OperatorExtended.Addition,
			steps: 5,
			accuracy: 1
		})

		expect(steps.every((step) => step.skillAfter === 100)).toBe(true)
		expect(steps.every((step) => !step.difficultyGateBlocked)).toBe(true)
		expect(steps.every((step) => step.ceilingGainClamped)).toBe(true)
	})

	it('records partial gain truncation when a correct answer reaches the ceiling', () => {
		const highGainTuning = {
			...adaptiveTuning,
			gains: { ...adaptiveTuning.gains, baseSkillGain: 10 },
			thresholds: {
				...adaptiveTuning.thresholds,
				minDifficultyRatio: 0
			}
		}
		const [step] = runTuningSimulation({
			...baseConfig,
			tuning: highGainTuning,
			startingSkills: [99, 99, 99, 99],
			operator: OperatorExtended.Addition,
			steps: 1,
			accuracy: 1
		})

		expect(step).toMatchObject({
			skillBefore: 99,
			skillAfter: 100,
			difficultyGateBlocked: false,
			ceilingGainClamped: true
		})
	})

	it('does not report floor truncation when low-skill protection caps the penalty', () => {
		const steps = runTuningSimulation({
			...baseConfig,
			startingSkills: [0, 0, 0, 0],
			operator: OperatorExtended.Addition,
			steps: 5,
			accuracy: 0
		})

		expect(steps.every((step) => step.skillAfter === 0)).toBe(true)
		expect(steps.every((step) => !step.floorPenaltyClamped)).toBe(true)
	})

	it('records partial penalty truncation when an incorrect answer reaches the floor', () => {
		const highPenaltyTuning = {
			...adaptiveTuning,
			penalties: {
				...adaptiveTuning.penalties,
				basePenalty: 10,
				lowSkillPenaltyCapThreshold: 1
			}
		}
		const [step] = runTuningSimulation({
			...baseConfig,
			tuning: highPenaltyTuning,
			startingSkills: [2, 2, 2, 2],
			operator: OperatorExtended.Addition,
			steps: 1,
			accuracy: 0
		})

		expect(step).toMatchObject({
			skillBefore: 2,
			skillAfter: 0,
			floorPenaltyClamped: true
		})
	})

	it('uses completed incorrect puzzles to drive cooldown generation', () => {
		const noCooldownTuning = {
			...adaptiveTuning,
			penalties: {
				...adaptiveTuning.penalties,
				cooldownRangeReduction: 0
			}
		}
		const withCooldown = runTuningSimulation({
			...baseConfig,
			startingSkills: [50, 50, 50, 50],
			operator: OperatorExtended.Addition,
			steps: 10,
			accuracy: 0,
			puzzleSeed: 1,
			answerSeed: deriveAnswerSeed(1)
		})
		const withoutCooldown = runTuningSimulation({
			...baseConfig,
			tuning: noCooldownTuning,
			startingSkills: [50, 50, 50, 50],
			operator: OperatorExtended.Addition,
			steps: 10,
			accuracy: 0,
			puzzleSeed: 1,
			answerSeed: deriveAnswerSeed(1)
		})

		expect(withCooldown[0]?.difficulty).toBe(withoutCooldown[0]?.difficulty)
		expect(withCooldown[0]?.isCooldownPuzzle).toBe(false)
		expect(withCooldown.slice(1).some((step) => step.isCooldownPuzzle)).toBe(
			true
		)
		expect(withCooldown.slice(1).map((step) => step.difficulty)).not.toEqual(
			withoutCooldown.slice(1).map((step) => step.difficulty)
		)
	})

	it('records compact puzzle composition facts', () => {
		const steps = runTuningSimulation({
			...baseConfig,
			startingSkills: [80, 80, 80, 80],
			operator: OperatorExtended.All,
			steps: 100,
			accuracy: 1
		})

		expect(steps.some((step) => step.unknownPartIndex !== 2)).toBe(true)
		expect(steps.some((step) => step.puzzleMode !== 0)).toBe(true)
		expect(
			steps.every(
				(step) =>
					typeof step.hasCarryOrBorrow === 'boolean' &&
					typeof step.hasNegativeSubtractionResult === 'boolean' &&
					typeof step.isUnknownDivisor === 'boolean'
			)
		).toBe(true)
	})
})
