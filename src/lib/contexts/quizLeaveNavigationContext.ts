import { getContext, setContext } from 'svelte'

export type QuizLeaveNavigationContext = {
	requestQuizLeaveNavigation: (destination: string) => void
	navigateWithQuizLeaveBypass: (destination: string) => void
}

const quizLeaveNavigationContextKey = Symbol('quiz-leave-navigation-context')

export function setQuizLeaveNavigationContext(
	context: QuizLeaveNavigationContext
) {
	setContext(quizLeaveNavigationContextKey, context)
}

export function getQuizLeaveNavigationContext(
	fallback?: QuizLeaveNavigationContext
) {
	const context = getContext<QuizLeaveNavigationContext | undefined>(
		quizLeaveNavigationContextKey
	)

	if (context) return context
	if (fallback) return fallback

	throw new Error(
		'Quiz leave navigation context is not registered. Ensure the root layout provides quiz leave handlers before using them.'
	)
}
