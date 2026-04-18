import type { BeforeNavigate } from '@sveltejs/kit'

type GuardBeforeNavigateHandler = (options: {
	toUrl: URL
	isInternalNavigation: boolean
	cancelNavigation: () => void
}) => void

export function handleLayoutBeforeNavigate(
	to: BeforeNavigate['to'],
	cancelNavigation: () => void,
	handleBeforeNavigate: GuardBeforeNavigateHandler
): void {
	if (!to) return

	handleBeforeNavigate({
		toUrl: to.url,
		isInternalNavigation: Boolean(to.route.id),
		cancelNavigation
	})
}
