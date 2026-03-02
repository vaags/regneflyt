export const AppSettings = {
	isProduction: import.meta.env.PROD,
	separatorPageDuration: import.meta.env.DEV ? 1 : 3,
	regneflytThresholdSeconds: 3,
	minTable: 1,
	maxTable: 15,
	transitionDuration: {
		duration: 200
	},
	pageTransitionDuration: {
		duration: 100
	}
} as const

// Difficulty score per multiplication/division table. Used for scoring and adaptive ordering.
export const tableDifficultyScores: ReadonlyMap<number, number> = new Map([
	[1, 10],
	[2, 20],
	[3, 30],
	[4, 30],
	[5, 20],
	[6, 40],
	[7, 50],
	[8, 50],
	[9, 40],
	[10, 10],
	[11, 20],
	[12, 60],
	[13, 60],
	[14, 70],
	[15, 70]
])

// Tables sorted by ascending difficulty score.
export const tablesByDifficulty: number[] = [
	...tableDifficultyScores.keys()
].sort(
	(a, b) =>
		(tableDifficultyScores.get(a) ?? 0) - (tableDifficultyScores.get(b) ?? 0)
)
