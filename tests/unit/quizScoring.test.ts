import { describe, expect, it } from 'vitest'
import {
	hasRegneflytStar,
	regneflytThresholdSeconds
} from '#lib/domain/quiz/quizScoring.ts'

describe('quizScoring', () => {
	it.each([
		[{ isCorrect: true, duration: regneflytThresholdSeconds }, true],
		[
			{
				isCorrect: true,
				duration: regneflytThresholdSeconds + 0.001
			},
			false
		],
		[{ isCorrect: false, duration: 1 }, false],
		[{ isCorrect: undefined, duration: 1 }, false]
	] as const)(
		'classifies Regneflyt stars at the threshold',
		(puzzle, expected) => {
			expect(hasRegneflytStar(puzzle)).toBe(expected)
		}
	)
})
