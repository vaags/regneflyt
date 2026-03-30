import type { PageLoad } from './$types'
import { getQuiz } from '$lib/helpers/quizHelper'
import { buildQuizParams } from '$lib/helpers/urlParamsHelper'

export const load: PageLoad = ({ url }) => {
	const menuQuiz = getQuiz(url.searchParams)

	return {
		animateSkill: url.searchParams.get('animate') === 'true',
		menuUrl: `/?${buildQuizParams(menuQuiz)}`
	}
}
