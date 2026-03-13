import { invariant } from '../../helpers/assertions'

const prefersReducedMotion =
	typeof window !== 'undefined' &&
	typeof window.matchMedia === 'function' &&
	window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const AppSettings = {
	isProduction: import.meta.env.PROD,
	separatorPageDuration: prefersReducedMotion ? 0 : import.meta.env.DEV ? 1 : 3,
	regneflytThresholdSeconds: 3,
	minTable: 1,
	maxTable: 14,
	additionMinRange: 1,
	additionMaxRange: 200,
	subtractionMinRange: -50,
	subtractionMaxRange: 100,
	transitionDuration: {
		duration: prefersReducedMotion ? 0 : 200
	},
	pageTransitionDuration: {
		duration: prefersReducedMotion ? 0 : 100
	}
}

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

// Tables sorted by ascending difficulty score — derived from tableDifficultyScores.
export const tablesByDifficulty: number[] = [
	...tableDifficultyScores.keys()
].sort(
	(a, b) =>
		(tableDifficultyScores.get(a) ?? 0) - (tableDifficultyScores.get(b) ?? 0)
)

// ── Invariants (dev/test only, stripped in production) ───────────────
if (!import.meta.env.PROD) {
	const expectedTables = Array.from(
		{ length: AppSettings.maxTable - AppSettings.minTable + 1 },
		(_, i) => AppSettings.minTable + i
	)
	invariant(
		expectedTables.every((t) => tableDifficultyScores.has(t)) &&
			tableDifficultyScores.size === expectedTables.length,
		'tableDifficultyScores must contain exactly minTable through maxTable'
	)
	invariant(
		AppSettings.additionMinRange < AppSettings.additionMaxRange &&
			AppSettings.subtractionMinRange < AppSettings.subtractionMaxRange,
		'addition/subtraction ranges must be ordered'
	)
}
