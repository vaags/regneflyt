export type AdaptiveDifficultySlackInputs = {
	incorrectPenaltyBase: number
	incorrectPenaltySlownessFactor: number
}

export function getAdaptiveDifficultyWindowSlack(
	inputs: AdaptiveDifficultySlackInputs
): number {
	return Math.round(
		inputs.incorrectPenaltyBase + inputs.incorrectPenaltySlownessFactor
	)
}
