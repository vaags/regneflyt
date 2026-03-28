import { describe, expect, it } from 'vitest'
import { parseQuizUrlQuery } from '$lib/models/quizQuerySchema'

describe('quizQuerySchema', () => {
	it('parses expected primitive values from query params', () => {
		const query = parseQuizUrlQuery(
			new URLSearchParams(
				'title=Rask matte&duration=2.5&showProgressBar=true&difficulty=1&allowNegativeAnswers=false&mulValues=2,3&divValues=4,5&puzzleMode=2&operator=3&seed=42&addMin=1&addMax=20&subMin=-10&subMax=100'
			)
		)

		expect(query.title).toBe('Rask matte')
		expect(query.duration).toBe(2.5)
		expect(query.showProgressBar).toBe(true)
		expect(query.difficulty).toBe(1)
		expect(query.allowNegativeAnswers).toBe(false)
		expect(query.mulValues).toEqual([2, 3])
		expect(query.divValues).toEqual([4, 5])
		expect(query.puzzleMode).toBe(2)
		expect(query.operator).toBe(3)
		expect(query.seed).toBe(42)
		expect(query.addMin).toBe(1)
		expect(query.addMax).toBe(20)
		expect(query.subMin).toBe(-10)
		expect(query.subMax).toBe(100)
	})

	it('applies defaults and undefineds for missing and null-like values', () => {
		const query = parseQuizUrlQuery(
			new URLSearchParams('title=undefined&mulValues=null&divValues=')
		)

		expect(query.title).toBeUndefined()
		expect(query.showProgressBar).toBe(false)
		expect(query.allowNegativeAnswers).toBe(true)
		expect(query.mulValues).toBeUndefined()
		expect(query.divValues).toBeUndefined()
	})

	it('keeps boolean compatibility where any non-false value is true', () => {
		const query = parseQuizUrlQuery(
			new URLSearchParams('showProgressBar=hello&allowNegativeAnswers=no')
		)

		expect(query.showProgressBar).toBe(true)
		expect(query.allowNegativeAnswers).toBe(true)
	})

	it('maps malformed numbers to undefined for downstream fallback handling', () => {
		const query = parseQuizUrlQuery(
			new URLSearchParams(
				'duration=abc&difficulty=foo&operator=bar&puzzleMode=baz&seed=nope&addMin=left&addMax=right&subMin=down&subMax=up'
			)
		)

		expect(query.duration).toBeUndefined()
		expect(query.difficulty).toBeUndefined()
		expect(query.operator).toBeUndefined()
		expect(query.puzzleMode).toBeUndefined()
		expect(query.seed).toBeUndefined()
		expect(query.addMin).toBeUndefined()
		expect(query.addMax).toBeUndefined()
		expect(query.subMin).toBeUndefined()
		expect(query.subMax).toBeUndefined()
	})

	it('rejects partial numeric tokens and keeps only strict integer array values', () => {
		const query = parseQuizUrlQuery(
			new URLSearchParams(
				'duration=2m&difficulty=4x&seed=100abc&mulValues=2, 3 ,hello,4.5,+6&divValues=foo,bar'
			)
		)

		expect(query.duration).toBeUndefined()
		expect(query.difficulty).toBeUndefined()
		expect(query.seed).toBeUndefined()
		expect(query.mulValues).toEqual([2, 3, 6])
		expect(query.divValues).toBeUndefined()
	})
})
