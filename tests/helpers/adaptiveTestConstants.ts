import { computeDifficultyWindow } from '../../src/lib/domain/puzzle-generation/puzzleGenerator'
import { getPuzzleDifficulty } from '../../src/lib/domain/puzzle-generation/puzzleDifficulty'
import { Operator } from '../../src/lib/domain/arithmetic/operator'
import { adaptiveTuning } from '../../src/lib/domain/skill-progression/adaptiveTuning'
import type { PuzzlePartSet } from '../../src/lib/domain/puzzle-generation/puzzle'

export const adaptiveSkillBounds = adaptiveTuning.skillBounds
export const adaptiveDifficultyWindowOvershoot =
	adaptiveTuning.thresholds.difficultyWindowOvershoot
export const adaptiveMinWindowSize = adaptiveTuning.thresholds.minWindowSize

export type AdaptiveDifficultySlackInputs = {
	basePenalty: number
	slownessPenaltyBonus: number
}

export const adaptiveDifficultyWebkitEarlySessionSlack = 10

export const adaptiveDifficultyWindowSlack = getAdaptiveDifficultyWindowSlack({
	basePenalty: adaptiveTuning.penalties.basePenalty,
	slownessPenaltyBonus: adaptiveTuning.penalties.slownessPenaltyBonus
})

export function getAdaptivePuzzleDifficulty(
	operator: Operator,
	values: readonly [left: number, right: number, result: number]
): number {
	const createPart = (generatedValue: number): PuzzlePartSet[number] => ({
		generatedValue,
		userDefinedValue: undefined
	})
	const parts: PuzzlePartSet = [
		createPart(values[0]),
		createPart(values[1]),
		createPart(values[2])
	]
	return getPuzzleDifficulty(operator, parts)
}

export function getAdaptiveDifficultyWindowSlack(
	inputs: AdaptiveDifficultySlackInputs
): number {
	return Math.round(inputs.basePenalty + inputs.slownessPenaltyBonus)
}

/**
 * Computes the adaptive difficulty window [minDifficulty, maxDifficulty]
 * for a given skill level. Delegates to the production formula in
 * puzzleGenerator.ts so tests stay in sync with generation behavior.
 * Operator only affects window prioritization (not min/max), so a fixed
 * operator is used here and the weak-operator boost is left disabled.
 */
export function computeAdaptiveDifficultyWindow(skill: number): {
	minDifficulty: number
	maxDifficulty: number
} {
	const { minDifficulty, maxDifficulty } = computeDifficultyWindow({
		operator: Operator.Addition,
		skill,
		applyWeakOperatorBoost: false
	})
	return { minDifficulty, maxDifficulty }
}
