import { invariant } from '$lib/helpers/assertions'

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
	},
	correctionWrongDuration: prefersReducedMotion ? 0 : 1000
}

// Difficulty score per multiplication/division table (0–100 scale).
// Used by getPuzzleDifficulty() for skill updates and by tablesByDifficulty for unlock order.
//
// Scoring rationale — scores reflect three factors:
//   1. Pattern shortcuts: Tables with simple mental tricks score low.
//      1× (identity), 10× (append zero), 2× (doubling), 5× (halve-and-shift) are easiest.
//   2. Reducibility: 4× = double-double, 9× has the digit-sum/complement trick.
//      These score lower than their product magnitude would suggest.
//   3. Rote difficulty: Tables dominated by large primes or products with no shortcut
//      (6×, 7×, 8×, 12–14×) require pure memorisation and score highest.
//
// The relative ordering matters more than exact values — they are normalised to 0–1
// in getPuzzleDifficulty() and blended with a factor-difficulty term.
// Sorted result: 1, 10, 2, 5, 4, 3, 9, 11, 6, 8, 7, 12, 13, 14
export const tableDifficultyScores: ReadonlyMap<number, number> = new Map([
	[1, 5], //    identity — trivial
	[2, 12], //   doubling — strong pattern
	[3, 22], //   small products, mild pattern (sum of digits)
	[4, 16], //   double-the-double shortcut
	[5, 14], //   always ends in 0/5 — strong pattern
	[6, 35], //   no shortcut, mid-range products
	[7, 46], //   prime, no shortcut, large products
	[8, 44], //   double-double-double helps slightly, but products are large
	[9, 25], //   digit-sum trick + complement trick — pattern discount
	[10, 8], //   append zero — near-trivial
	[11, 28], //  repeating-digit pattern for 11×1–9, then mild
	[12, 55], //  large products, no shortcut
	[13, 62], //  prime, large products
	[14, 68] //   largest products in range, no shortcut
])

// Difficulty score per second factor in multiplication/division (0–100 scale).
// Unlike raw factor magnitude, this models mental shortcuts directly:
//   1. 10× is heavily discounted because append-zero is easier than ×9.
//   2. 1×, 2×, 5× remain easy due to strong arithmetic patterns.
//   3. 7×, 8×, 9× are hardest because they lack equally strong shortcuts.
export const factorDifficultyScores: ReadonlyMap<number, number> = new Map([
	[1, 5], //    identity — trivial
	[2, 12], //   doubling — strong pattern
	[3, 20], //   small products, mild pattern
	[4, 16], //   double-the-double shortcut
	[5, 14], //   ends in 0/5 — strong pattern
	[6, 30], //   moderate products, few shortcuts
	[7, 40], //   large products, weak pattern support
	[8, 46], //   large products, double-double helps only a little
	[9, 50], //   large products; complement trick helps less here than as a table
	[10, 12] //  append zero — near-trivial despite large magnitude
])

export const maxFactorDifficultyScore = Math.max(
	...factorDifficultyScores.values()
)

// Shortcut-factor interaction discounts applied to the table component only.
// These factors change the nature of the task (place-value / doubling / halve-and-shift),
// so a hard table with a shortcut factor should feel materially easier than a hard table
// with a rote factor like 7, 8, or 9.
export const factorShortcutTableDiscounts: ReadonlyMap<number, number> =
	new Map([
		// Identity shortcut: n×1 and n÷n should not inherit full table hardness.
		[1, 0.5],
		[2, 0.35],
		[5, 0.4],
		// Place-value shortcut (append zero) radically reduces cognitive load,
		// so this receives a stronger discount than 2x and 5x.
		[10, 0.75]
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
	const expectedFactors = Array.from({ length: 10 }, (_, i) => i + 1)
	invariant(
		expectedTables.every((t) => tableDifficultyScores.has(t)) &&
			tableDifficultyScores.size === expectedTables.length,
		'tableDifficultyScores must contain exactly minTable through maxTable'
	)
	invariant(
		expectedFactors.every((f) => factorDifficultyScores.has(f)) &&
			factorDifficultyScores.size === expectedFactors.length &&
			maxFactorDifficultyScore > 0,
		'factorDifficultyScores must contain exactly 1 through 10'
	)
	invariant(
		[...factorShortcutTableDiscounts.entries()].every(
			([factor, discount]) =>
				factorDifficultyScores.has(factor) && discount >= 0 && discount < 1
		),
		'factorShortcutTableDiscounts must reference valid factors with discounts in [0, 1)'
	)
	invariant(
		AppSettings.additionMinRange < AppSettings.additionMaxRange &&
			AppSettings.subtractionMinRange < AppSettings.subtractionMaxRange,
		'addition/subtraction ranges must be ordered'
	)
}
