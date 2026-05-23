import { adaptiveTuning } from '../../src/lib/models/AdaptiveProfile'

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
 * for a given skill level, mirroring the production formula in puzzleHelper.ts.
 */
export function computeAdaptiveDifficultyWindow(skill: number): {
	minDifficulty: number
	maxDifficulty: number
} {
	const maxDifficulty = Math.min(
		adaptiveTuning.skillBounds.maxSkill,
		Math.ceil(skill + adaptiveTuning.thresholds.difficultyWindowOvershoot)
	)
	let minDifficulty = Math.max(
		Math.floor(skill * adaptiveTuning.thresholds.minDifficultyRatio),
		skill - adaptiveTuning.thresholds.difficultyWindowOvershoot
	)
	if (maxDifficulty - minDifficulty < adaptiveTuning.thresholds.minWindowSize) {
		minDifficulty = Math.max(
			0,
			maxDifficulty - adaptiveTuning.thresholds.minWindowSize
		)
	}
	return { minDifficulty, maxDifficulty }
}
