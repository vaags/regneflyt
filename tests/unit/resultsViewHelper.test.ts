import { describe, expect, it } from 'vitest'
import {
	formatPuzzleDurationSeconds,
	hasRegneflytStar
} from '$lib/helpers/quiz/resultsViewHelper'

describe('resultsViewHelper', () => {
	describe('formatPuzzleDurationSeconds', () => {
		it('rounds to one decimal and formats using the provided locale', () => {
			expect(formatPuzzleDurationSeconds(1.24, 'en')).toBe('1.2')
			expect(formatPuzzleDurationSeconds(1.25, 'en')).toBe('1.3')
		})
	})

	describe('hasRegneflytStar', () => {
		it('returns true only for correct puzzles within the threshold', () => {
			expect(hasRegneflytStar({ isCorrect: true, duration: 2.5 })).toBe(true)
			expect(hasRegneflytStar({ isCorrect: false, duration: 2.5 })).toBe(false)
		})
	})
})
