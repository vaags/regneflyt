import {
	parseQuizUrlQuery,
	type QuizUrlQuery
} from '$lib/models/quizQuerySchema'

export function getQuizLoadQuery(url: URL): QuizUrlQuery {
	return parseQuizUrlQuery(url.searchParams)
}

export function hasReplayQueryFlag(url: URL): boolean {
	return url.searchParams.get('replay') === 'true'
}
