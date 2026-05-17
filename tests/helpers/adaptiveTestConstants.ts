import { adaptiveTuning } from '../../src/lib/models/AdaptiveProfile'

export type AdaptiveDifficultySlackInputs = {
	incorrectPenaltyBase: number
	incorrectPenaltySlownessFactor: number
}

export const adaptiveDifficultyWebkitEarlySessionSlack = 10

export function getAdaptiveDifficultyWindowSlack(
	inputs: AdaptiveDifficultySlackInputs
): number {
	return Math.round(
		inputs.incorrectPenaltyBase + inputs.incorrectPenaltySlownessFactor
	)
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
		Math.ceil(skill + adaptiveTuning.thresholds.adaptiveDifficultyMaxOvershoot)
	)
	let minDifficulty = Math.max(
		Math.floor(skill * adaptiveTuning.thresholds.minDifficultyThreshold),
		skill - adaptiveTuning.thresholds.adaptiveDifficultyMaxOvershoot
	)
	if (
		maxDifficulty - minDifficulty <
		adaptiveTuning.thresholds.asymmetricWindowFloor
	) {
		minDifficulty = Math.max(
			0,
			maxDifficulty - adaptiveTuning.thresholds.asymmetricWindowFloor
		)
	}
	return { minDifficulty, maxDifficulty }
}
