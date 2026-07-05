import type { Quiz } from '$lib/models/Quiz'
import { getQuiz } from './quizHelper'
import {
	buildQuizParams,
	buildPathWithQuizQueryParams
} from '../urlParamsHelper'

export function buildMenuPath(quiz: Quiz): string {
	return `/?${buildQuizParams(quiz)}`
}

export function buildQuizPath(quiz: Quiz): string {
	return `/quiz?${buildQuizParams(quiz)}`
}

// Builds the destination for cancelling an in-progress quiz. Returns to the
// route the quiz was started from (if known) instead of always going home.
export function buildQuizCancelPath(
	quiz: Quiz,
	entryPath: string | undefined
): string {
	return buildPathWithQuizQueryParams(entryPath ?? '/', buildQuizParams(quiz))
}

export function buildCanonicalQuizPathFromSearchParams(
	searchParams: URLSearchParams
): string {
	return buildQuizPath(getQuiz(searchParams))
}
