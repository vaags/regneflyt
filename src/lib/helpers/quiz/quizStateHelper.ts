import { QuizState } from '#lib/domain/quiz/quizState.ts'
import type { OperatorSkillMap } from '#lib/domain/skill-progression/skillModel.ts'
import type { Quiz } from '#lib/domain/quiz/quiz.ts'
import type { QuizUrlQuery } from '#lib/models/quizQuerySchema.ts'
import { getQuiz, initQuizFromQuery } from './quizHelper'
type ResolveQuizRouteEntryInput = {
	query: QuizUrlQuery
	operatorSkills: OperatorSkillMap
}

export type QuizRouteEntryState = {
	quiz: Quiz
	preQuizSkill: OperatorSkillMap
}

export function resolveMenuQuiz(
	query: QuizUrlQuery,
	operatorSkills: OperatorSkillMap
): Quiz {
	return initQuizFromQuery(query, operatorSkills)
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
		resolveMenuQuiz(input.query, input.operatorSkills)
	)

	return {
		quiz,
		preQuizSkill: [...quiz.skillByOperator]
	}
}

export function resolveResultsFallbackQuiz(menuUrl: string): Quiz {
	return getQuiz(new URLSearchParams(menuUrl.split('?')[1] ?? ''))
}
