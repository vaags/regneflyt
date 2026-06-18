import {
	parseQuizUrlQuery,
	type QuizUrlQuery
} from '$lib/models/quizQuerySchema'

export function getQuizLoadQuery(url: URL): QuizUrlQuery {
	return parseQuizUrlQuery(url.searchParams)
}
