export const quizQueryRoutingPolicyByPath = {
	'/': 'canonical',
	'/settings': 'canonical'
} as const

export type QuizQueryRoutingPolicy =
	| (typeof quizQueryRoutingPolicyByPath)[keyof typeof quizQueryRoutingPolicyByPath]
	| 'preserve'

export function getQuizQueryRoutingPolicy(
	path: string
): QuizQueryRoutingPolicy {
	if (path === '/' || path === '/settings') {
		return quizQueryRoutingPolicyByPath[path]
	}
	return 'preserve'
}
