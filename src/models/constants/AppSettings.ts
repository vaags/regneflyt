export const AppSettings = {
	isProduction: import.meta.env.PROD,
	separatorPageDuration: import.meta.env.DEV ? 1 : 3,
	regneflytThresholdSeconds: 3,
	minTable: 1,
	maxTable: 14,
	transitionDuration: {
		duration: 200
	},
	pageTransitionDuration: {
		duration: 100
	}
} as const

// Difficulty score per multiplication/division table. Used for scoring and adaptive ordering.
export const tableDifficultyScores: ReadonlyMap<number, number> = new Map([
	[1, 5],
	[2, 12],
	[3, 22],
	[4, 16],
	[5, 14],
	[6, 35],
	[7, 46],
	[8, 44],
	[9, 25],
	[10, 8],
	[11, 28],
	[12, 55],
	[13, 62],
	[14, 68]
])

// Tables sorted by ascending difficulty score.
export const tablesByDifficulty: number[] = [
	...tableDifficultyScores.keys()
].sort(
	(a, b) =>
		(tableDifficultyScores.get(a) ?? 0) - (tableDifficultyScores.get(b) ?? 0)
)
