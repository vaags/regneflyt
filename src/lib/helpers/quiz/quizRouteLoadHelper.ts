import {
	parseQuizUrlQuery,
	type QuizUrlQuery
} from '#lib/models/quizQuerySchema.ts'

export function getQuizLoadQuery(url: URL): QuizUrlQuery {
	return parseQuizUrlQuery(url.searchParams)
}
