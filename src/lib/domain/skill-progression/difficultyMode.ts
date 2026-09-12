// The IDs double as URL parameter values and must remain stable.
export const adaptiveDifficultyId = 1 as const
export const customDifficultyId = 0 as const

export type DifficultyMode =
	typeof adaptiveDifficultyId | typeof customDifficultyId

/** Normalizes legacy or missing difficulty values to a supported mode. */
export function normalizeDifficulty(
	difficultyParam: number | undefined
): DifficultyMode {
	if (difficultyParam === customDifficultyId) return customDifficultyId

	return adaptiveDifficultyId
}

/** Returns whether a raw difficulty value resolves to adaptive mode. */
export function isAdaptiveDifficulty(
	difficultyParam: number | undefined
): boolean {
	return normalizeDifficulty(difficultyParam) === adaptiveDifficultyId
}
