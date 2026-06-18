import { QuizState } from '$lib/constants/QuizState'
import type { AdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
import type { Quiz } from '$lib/models/Quiz'
import type { QuizUrlQuery } from '$lib/models/quizQuerySchema'
import { getQuiz, initQuizFromQuery } from './quizHelper'
type ResolveQuizRouteEntryInput = {
	query: QuizUrlQuery
	adaptiveSkills: AdaptiveSkillMap
}

export type QuizRouteEntryState = {
	quiz: Quiz
	preQuizSkill: AdaptiveSkillMap
}

export function resolveMenuQuiz(
	query: QuizUrlQuery,
	adaptiveSkills: AdaptiveSkillMap
): Quiz {
	return initQuizFromQuery(query, adaptiveSkills)
}

export function resetQuizForRouteEntry(quiz: Quiz): Quiz {
	return {
		...quiz,
		state: QuizState.AboutToStart
	}
}

export function resolveQuizRouteEntryState(
	input: ResolveQuizRouteEntryInput
): QuizRouteEntryState {
	const quiz = resetQuizForRouteEntry(
		resolveMenuQuiz(input.query, input.adaptiveSkills)
	)

	return {
		quiz,
		preQuizSkill: [...quiz.adaptiveSkillByOperator]
	}
}

export function resolveResultsFallbackQuiz(menuUrl: string): Quiz {
	return getQuiz(new URLSearchParams(menuUrl.split('?')[1] ?? ''))
}
