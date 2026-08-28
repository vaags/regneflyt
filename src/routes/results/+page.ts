import type { PageLoad } from './$types'
import { getQuiz } from '#lib/helpers/quiz/quizHelper.ts'
import { buildMenuPath } from '#lib/helpers/quiz/quizPathHelper.ts'

export const load: PageLoad = ({ url }) => {
	const menuQuiz = getQuiz(url.searchParams)

	return {
		animateSkill: url.searchParams.get('animate') === 'true',
		menuUrl: buildMenuPath(menuQuiz)
	}
}
