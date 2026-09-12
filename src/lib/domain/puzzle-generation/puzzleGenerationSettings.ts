import { invariant } from '../shared/assertions.ts'

export type PuzzleGenerationSettings = {
	readonly minTable: number
	readonly maxTable: number
	readonly additionMinRange: number
	readonly additionMaxRange: number
	readonly subtractionMinRange: number
	readonly subtractionMaxRange: number
	readonly maxPuzzleAnswerMagnitude: number
}

export const puzzleGenerationSettings: PuzzleGenerationSettings = Object.freeze(
	{
		minTable: 1,
		maxTable: 14,
		additionMinRange: 1,
		additionMaxRange: 200,
		subtractionMinRange: -50,
		subtractionMaxRange: 100,
		maxPuzzleAnswerMagnitude: 999
	}
)

// Cognitive difficulty scores for multiplication/division tables.
// Pattern shortcuts reduce scores; large or prime-heavy tables with few
// shortcuts score higher. Relative order matters more than exact values:
// puzzleDifficulty.ts normalizes these scores, while tablesByDifficulty
// uses them to determine adaptive unlock order.
export const tableDifficultyScores: ReadonlyMap<number, number> = new Map([
	[1, 5], // identity — trivial
	[2, 12], // doubling — strong pattern
	[3, 22], // small products, mild pattern
	[4, 16], // double-the-double shortcut
	[5, 14], // always ends in 0 or 5
	[6, 35], // mid-range products with few shortcuts
	[7, 46], // prime table, large products, no shortcut
	[8, 44], // repeated doubling helps, but products are large
	[9, 25], // digit-sum and complement patterns
	[10, 8], // append zero — near-trivial
	[11, 28], // repeating-digit pattern for factors 1–9
	[12, 55], // large products with no strong shortcut
	[13, 62], // prime table with large products
	[14, 68] // largest products in the supported range
])

// Cognitive difficulty scores for the second factor. These differ from table
// scores because some patterns help less when the value is the varying factor.
export const factorDifficultyScores: ReadonlyMap<number, number> = new Map([
	[1, 5], // identity — trivial
	[2, 12], // doubling — strong pattern
	[3, 20], // small products, mild pattern
	[4, 16], // double-the-double shortcut
	[5, 14], // results always end in 0 or 5
	[6, 30], // moderate products with few shortcuts
	[7, 40], // large products with weak pattern support
	[8, 46], // repeated doubling helps, but products are large
	[9, 50], // complement trick helps less as the second factor
	[10, 12] // append zero despite the larger magnitude
])

export const maxFactorDifficultyScore = Math.max(
	...factorDifficultyScores.values()
)

// Shortcut factors reduce the table contribution because they change the task:
// identity removes multiplication work, while doubling, halving, and place-value
// patterns make otherwise difficult tables materially easier.
export const factorShortcutTableDiscounts: ReadonlyMap<number, number> =
	new Map([
		[1, 0.5], // identity shortcut
		[2, 0.35], // doubling
		[5, 0.4], // halve-and-shift pattern
		[10, 0.75] // append zero — strongest shortcut
	])

export const tablesByDifficulty: number[] = [
	...tableDifficultyScores.keys()
].sort(
	(a, b) =>
		(tableDifficultyScores.get(a) ?? 0) - (tableDifficultyScores.get(b) ?? 0)
)

export function validatePuzzleGenerationSettings(
	settings: PuzzleGenerationSettings = puzzleGenerationSettings
): void {
	invariant(
		settings.minTable <= settings.maxTable,
		'multiplication/division table range must be ordered'
	)
	invariant(
		settings.additionMinRange < settings.additionMaxRange &&
			settings.subtractionMinRange < settings.subtractionMaxRange,
		'addition/subtraction ranges must be ordered'
	)
	invariant(
		settings.maxPuzzleAnswerMagnitude > 0,
		'maxPuzzleAnswerMagnitude must be positive'
	)
}

export function validateDifficultyScoreRegistries(): void {
	const expectedTables = Array.from(
		{
			length:
				puzzleGenerationSettings.maxTable -
				puzzleGenerationSettings.minTable +
				1
		},
		(_, index) => puzzleGenerationSettings.minTable + index
	)
	const expectedFactors = Array.from({ length: 10 }, (_, index) => index + 1)

	invariant(
		expectedTables.every((table) => tableDifficultyScores.has(table)) &&
			tableDifficultyScores.size === expectedTables.length,
		'tableDifficultyScores must contain exactly minTable through maxTable'
	)
	invariant(
		expectedFactors.every((factor) => factorDifficultyScores.has(factor)) &&
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
}
