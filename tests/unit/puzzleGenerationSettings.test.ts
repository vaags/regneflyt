import { describe, expect, it } from 'vitest'
import {
	factorDifficultyScores,
	factorShortcutTableDiscounts,
	puzzleGenerationSettings,
	tableDifficultyScores,
	tablesByDifficulty,
	validateDifficultyScoreRegistries,
	validatePuzzleGenerationSettings,
	type PuzzleGenerationSettings
} from '#lib/domain/puzzle-generation/puzzleGenerationSettings.ts'

function withPuzzleGenerationSettings(
	overrides: Partial<PuzzleGenerationSettings>
): PuzzleGenerationSettings {
	return { ...puzzleGenerationSettings, ...overrides }
}

describe('puzzleGenerationSettings', () => {
	it('accepts the canonical settings', () => {
		expect(() => {
			validatePuzzleGenerationSettings()
		}).not.toThrow()
	})

	it.each([
		withPuzzleGenerationSettings({
			additionMinRange: 20,
			additionMaxRange: 20
		}),
		withPuzzleGenerationSettings({
			additionMinRange: 21,
			additionMaxRange: 20
		}),
		withPuzzleGenerationSettings({
			subtractionMinRange: 10,
			subtractionMaxRange: 10
		}),
		withPuzzleGenerationSettings({
			subtractionMinRange: 11,
			subtractionMaxRange: 10
		})
	])('rejects unordered operand ranges', (settings) => {
		expect(() => {
			validatePuzzleGenerationSettings(settings)
		}).toThrow('addition/subtraction ranges must be ordered')
	})

	it('rejects a reversed table range', () => {
		expect(() => {
			validatePuzzleGenerationSettings(
				withPuzzleGenerationSettings({ minTable: 15, maxTable: 14 })
			)
		}).toThrow('multiplication/division table range must be ordered')
	})

	it('rejects a non-positive maximum answer magnitude', () => {
		expect(() => {
			validatePuzzleGenerationSettings(
				withPuzzleGenerationSettings({ maxPuzzleAnswerMagnitude: 0 })
			)
		}).toThrow('maxPuzzleAnswerMagnitude must be positive')
	})

	it('accepts the canonical difficulty score registries', () => {
		expect(() => {
			validateDifficultyScoreRegistries()
		}).not.toThrow()
	})

	it('orders every supported table by ascending difficulty', () => {
		const supportedTables = Array.from(
			{
				length:
					puzzleGenerationSettings.maxTable -
					puzzleGenerationSettings.minTable +
					1
			},
			(_, index) => puzzleGenerationSettings.minTable + index
		)

		expect([...tablesByDifficulty].sort((a, b) => a - b)).toEqual(
			supportedTables
		)
		expect(tablesByDifficulty).toEqual(
			[...supportedTables].sort(
				(a, b) =>
					(tableDifficultyScores.get(a) ?? 0) -
					(tableDifficultyScores.get(b) ?? 0)
			)
		)
	})

	it('defines valid shortcut discounts for known factors', () => {
		for (const [factor, discount] of factorShortcutTableDiscounts) {
			expect(factorDifficultyScores.has(factor)).toBe(true)
			expect(discount).toBeGreaterThanOrEqual(0)
			expect(discount).toBeLessThan(1)
		}
	})
})
