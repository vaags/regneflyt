export const quizQueryRoutingPolicyByPath = {
	'/': 'canonical',
	'/settings': 'canonical'
} as const

export type QuizQueryRoutingPolicy = 'canonical' | 'preserve'

type QuizQueryRoutingPath = keyof typeof quizQueryRoutingPolicyByPath

function isQuizQueryRoutingPath(path: string): path is QuizQueryRoutingPath {
	return path in quizQueryRoutingPolicyByPath
}

export function getQuizQueryRoutingPolicy(
	path: string
): QuizQueryRoutingPolicy {
	if (isQuizQueryRoutingPath(path)) {
		return quizQueryRoutingPolicyByPath[path]
	}
	return 'preserve'
}
