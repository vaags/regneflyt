type LayoutBeforeNavigateTarget = {
	url: URL
	route?: { id?: string | null } | null
}

type GuardBeforeNavigateHandler = (options: {
	toUrl: URL
	isInternalNavigation: boolean
	cancelNavigation: () => void
}) => void

export function handleLayoutBeforeNavigate(
	to: LayoutBeforeNavigateTarget | null,
	cancelNavigation: () => void,
	handleBeforeNavigate: GuardBeforeNavigateHandler
): void {
	if (!to) return

	handleBeforeNavigate({
		toUrl: to.url,
		isInternalNavigation: Boolean(to.route?.id),
		cancelNavigation
	})
}
