import type { Quiz } from '$lib/models/Quiz'
import { getQuiz } from './quizHelper'
import { buildQuizParams } from '../urlParamsHelper'

export function buildMenuPath(quiz: Quiz): string {
	return `/?${buildQuizParams(quiz)}`
}

export function buildQuizPath(quiz: Quiz): string {
	return `/quiz?${buildQuizParams(quiz)}`
}

export function buildCanonicalQuizPathFromSearchParams(
	searchParams: URLSearchParams
): string {
	return buildQuizPath(getQuiz(searchParams))
}
