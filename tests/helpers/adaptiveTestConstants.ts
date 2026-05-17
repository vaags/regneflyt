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
