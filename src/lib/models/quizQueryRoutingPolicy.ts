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
	return (
		quizQueryRoutingPolicyByPath[
			path as keyof typeof quizQueryRoutingPolicyByPath
		] ?? 'preserve'
	)
}
