import { describe, expect, it } from 'vitest'
import { formatPuzzleDurationSeconds } from '#lib/helpers/quiz/resultsViewHelper.ts'

describe('resultsViewHelper', () => {
	describe('formatPuzzleDurationSeconds', () => {
		it('rounds to one decimal and formats using the provided locale', () => {
			expect(formatPuzzleDurationSeconds(1.24, 'en')).toBe('1.2')
			expect(formatPuzzleDurationSeconds(1.25, 'en')).toBe('1.3')
		})
	})
})
