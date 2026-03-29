import type { PageLoad } from './$types'
import { getQuizLoadQuery } from '$lib/helpers/quizRouteLoadHelper'

export const load: PageLoad = ({ url }) => {
	return {
		query: getQuizLoadQuery(url)
	}
}
