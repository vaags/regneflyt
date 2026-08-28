import { describe, expect, it } from 'vitest'
import { Operator } from '#lib/constants/Operator.ts'
import { createTestQuiz } from './component-setup'
import {
	buildCanonicalQuizPathFromSearchParams,
	buildMenuPath,
	buildQuizCancelPath,
	buildQuizPath
} from '#lib/helpers/quiz/quizPathHelper.ts'

describe('quizPathHelper', () => {
	it('builds menu path with canonical quiz params', () => {
		const quiz = createTestQuiz({
			duration: 3,
			selectedOperator: Operator.Division
		})

		const path = buildMenuPath(quiz)
		const url = new URL(path, 'https://example.com')

		expect(url.pathname).toBe('/')
		expect(url.searchParams.get('duration')).toBe('3')
		expect(url.searchParams.get('operator')).toBe(Operator.Division.toString())
	})

	it('builds quiz path with canonical quiz params', () => {
		const quiz = createTestQuiz({
			duration: 5,
			selectedOperator: Operator.Subtraction
		})

		const path = buildQuizPath(quiz)
		const url = new URL(path, 'https://example.com')

		expect(url.pathname).toBe('/quiz')
		expect(url.searchParams.get('duration')).toBe('5')
		expect(url.searchParams.get('operator')).toBe(
			Operator.Subtraction.toString()
		)
	})

	it('builds canonical quiz path from raw search params', () => {
		const path = buildCanonicalQuizPathFromSearchParams(
			new URLSearchParams(
				'duration=999&operator=0&difficulty=0&addMin=90&addMax=10'
			)
		)
		const url = new URL(path, 'https://example.com')

		expect(url.pathname).toBe('/quiz')
		expect(url.searchParams.get('duration')).toBe('480')
		expect(url.searchParams.get('addMin')).toBe('10')
		expect(url.searchParams.get('addMax')).toBe('90')
	})

	it('builds cancel path using the entry route when known', () => {
		const quiz = createTestQuiz({
			duration: 3,
			selectedOperator: Operator.Division
		})

		const path = buildQuizCancelPath(quiz, '/settings')
		const url = new URL(path, 'https://example.com')

		expect(url.pathname).toBe('/settings')
		expect(url.searchParams.get('duration')).toBe('3')
		expect(url.searchParams.get('operator')).toBe(Operator.Division.toString())
	})

	it('falls back to the home menu when the entry route is unknown', () => {
		const quiz = createTestQuiz({
			duration: 3,
			selectedOperator: Operator.Division
		})

		const path = buildQuizCancelPath(quiz, undefined)
		const url = new URL(path, 'https://example.com')

		expect(url.pathname).toBe('/')
	})
})
