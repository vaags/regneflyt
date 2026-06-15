import { computeDifficultyWindow } from '../../src/lib/helpers/puzzleHelper'
import { Operator } from '../../src/lib/constants/Operator'

export type AdaptiveDifficultySlackInputs = {
	basePenalty: number
	slownessPenaltyBonus: number
}

export const adaptiveDifficultyWebkitEarlySessionSlack = 10

export function getAdaptiveDifficultyWindowSlack(
	inputs: AdaptiveDifficultySlackInputs
): number {
	return Math.round(inputs.basePenalty + inputs.slownessPenaltyBonus)
}

/**
 * Computes the adaptive difficulty window [minDifficulty, maxDifficulty]
 * for a given skill level. Delegates to the production formula in
 * puzzleHelper.ts so tests stay in sync with generation behavior.
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
