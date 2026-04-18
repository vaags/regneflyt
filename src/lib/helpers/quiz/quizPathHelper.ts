import type { Quiz } from '$lib/models/Quiz'
import { getQuiz } from './quizHelper'
import { buildQuizParams, buildReplayParams } from '../urlParamsHelper'
import type { LastResults } from '$lib/stores'

export function buildMenuPath(quiz: Quiz): string {
	return `/?${buildQuizParams(quiz)}`
}

export function buildQuizPath(quiz: Quiz): string {
	return `/quiz?${buildQuizParams(quiz)}`
}

export function buildReplayQuizPath(
	results: LastResults | null | undefined
): string | undefined {
	if (results == null || results.puzzleSet.length === 0) return undefined
	return `/quiz?${buildReplayParams(results.quiz)}`
}

export function buildCanonicalQuizPathFromSearchParams(
	searchParams: URLSearchParams
): string {
	return buildQuizPath(getQuiz(searchParams))
}
