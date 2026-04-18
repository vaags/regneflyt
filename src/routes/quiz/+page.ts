import type { PageLoad } from './$types'
import {
	getQuizLoadQuery,
	hasReplayQueryFlag
} from '$lib/helpers/quiz/quizRouteLoadHelper'

export const load: PageLoad = ({ url }) => {
	return {
		query: getQuizLoadQuery(url),
		isReplay: hasReplayQueryFlag(url)
	}
}
