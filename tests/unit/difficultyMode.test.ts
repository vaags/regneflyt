import { describe, expect, it } from 'vitest'
import {
	adaptiveDifficultyId,
	customDifficultyId,
	normalizeDifficulty
} from '#lib/domain/skill-progression/difficultyMode.ts'

describe('difficultyMode', () => {
	it('normalizes old difficulty values to adaptive/custom modes', () => {
		expect(normalizeDifficulty(0)).toBe(customDifficultyId)
		expect(normalizeDifficulty(1)).toBe(adaptiveDifficultyId)
		expect(normalizeDifficulty(6)).toBe(adaptiveDifficultyId)
		expect(normalizeDifficulty(undefined)).toBe(adaptiveDifficultyId)
		expect(normalizeDifficulty(99)).toBe(adaptiveDifficultyId)
	})
})
