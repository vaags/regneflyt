import { QuizState } from '$lib/constants/QuizState'
import type { AdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
import type { Quiz } from '$lib/models/Quiz'
import type { QuizUrlQuery } from '$lib/models/quizQuerySchema'
import { getQuiz, initQuizFromQuery, initQuizFromUrl } from './quizHelper'
import { buildReplayParams } from '../urlParamsHelper'
import type { LastResults } from '$lib/stores'

type ResolveQuizRouteEntryInput = {
	isReplay: boolean
	query: QuizUrlQuery
	adaptiveSkills: AdaptiveSkillMap
	results: LastResults | null | undefined
}

export type QuizRouteEntryState =
	| { status: 'empty' }
	| { status: 'redirect-home' }
	| {
			status: 'ready'
			quiz: Quiz
			preQuizSkill: AdaptiveSkillMap
	  }

export function resolveMenuQuiz(
	query: QuizUrlQuery,
	adaptiveSkills: AdaptiveSkillMap
): Quiz {
	return initQuizFromQuery(query, adaptiveSkills)
}

export function resolveQuizRouteEntry({
	isReplay,
	query,
	adaptiveSkills,
	results
}: ResolveQuizRouteEntryInput): Quiz | undefined {
	if (!isReplay) return resolveMenuQuiz(query, adaptiveSkills)
	if (results == null || results.puzzleSet.length === 0) return undefined

	return {
		...initQuizFromUrl(buildReplayParams(results.quiz), adaptiveSkills),
		replayPuzzles: results.puzzleSet
	}
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
	const initialQuiz = resolveQuizRouteEntry(input)

	if (input.isReplay && initialQuiz === undefined) {
		return { status: 'redirect-home' }
	}

	if (initialQuiz === undefined) {
		return { status: 'empty' }
	}

	const quiz = resetQuizForRouteEntry(initialQuiz)

	return {
		status: 'ready',
		quiz,
		preQuizSkill: [...quiz.adaptiveSkillByOperator]
	}
}

export function resolveResultsFallbackQuiz(menuUrl: string): Quiz {
	return getQuiz(new URLSearchParams(menuUrl.split('?')[1] ?? ''))
}
