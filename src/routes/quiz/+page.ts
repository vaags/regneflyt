import type { PageLoad } from './$types'
import { getQuizLoadQuery } from '#lib/helpers/quiz/quizRouteLoadHelper.ts'

export const load: PageLoad = ({ url }) => {
	return {
		query: getQuizLoadQuery(url)
	}
}
