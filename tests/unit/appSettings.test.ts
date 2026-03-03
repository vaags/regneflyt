import { describe, expect, it } from 'vitest'
import {
	AppSettings,
	tableDifficultyScores,
	tablesByDifficulty
} from '../../src/models/constants/AppSettings'

describe('appSettings', () => {
	it('tableDifficultyScores contains exactly minTable through maxTable', () => {
		const expectedKeys = Array.from(
			{ length: AppSettings.maxTable - AppSettings.minTable + 1 },
			(_, i) => AppSettings.minTable + i
		)

		expect([...tableDifficultyScores.keys()].sort((a, b) => a - b)).toEqual(
			expectedKeys
		)
	})

	it('tablesByDifficulty contains the same tables as tableDifficultyScores', () => {
		expect([...tablesByDifficulty].sort((a, b) => a - b)).toEqual(
			[...tableDifficultyScores.keys()].sort((a, b) => a - b)
		)
	})

	it('tablesByDifficulty is sorted by ascending difficulty score', () => {
		for (let i = 1; i < tablesByDifficulty.length; i++) {
			const prevScore = tableDifficultyScores.get(tablesByDifficulty[i - 1]!)!
			const currScore = tableDifficultyScores.get(tablesByDifficulty[i]!)!
			expect(prevScore).toBeLessThanOrEqual(currScore)
		}
	})

	it('addition and subtraction ranges are ordered', () => {
		expect(AppSettings.additionMinRange).toBeLessThan(
			AppSettings.additionMaxRange
		)
		expect(AppSettings.subtractionMinRange).toBeLessThan(
			AppSettings.subtractionMaxRange
		)
	})
})
