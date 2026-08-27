import { getContext, setContext } from 'svelte'

export type StickyGlobalNavStartActions = {
	onStart: () => void
	canCopyLink?: () => boolean
	getCopyLinkSearchParams?: () => URLSearchParams
}

export type StickyGlobalNavQuizNextButtonColor = 'red' | 'green' | 'gray'

export type StickyGlobalNavQuizControls = {
	value: number | undefined
	disabled: boolean
	disabledNext: boolean
	nextButtonColor: StickyGlobalNavQuizNextButtonColor
	ariaDescribedBy: string | undefined
	onValueChange: (value: number | undefined) => void
	onCompletePuzzle: (completedByKeyboard?: boolean) => void
}

export type StickyGlobalNavContext = {
	registerStartActions: (actions: StickyGlobalNavStartActions) => () => void
	registerQuizControls: (controls: StickyGlobalNavQuizControls) => () => void
}

const stickyGlobalNavContextKey = Symbol('sticky-global-nav-context')

export function setStickyGlobalNavContext(
	context: StickyGlobalNavContext
): void {
	setContext(stickyGlobalNavContextKey, context)
}

export function getStickyGlobalNavContext(): StickyGlobalNavContext {
	const context = getContext<StickyGlobalNavContext | undefined>(
		stickyGlobalNavContextKey
	)

	if (context) return context

	throw new Error(
		'Sticky global nav context is not registered. Ensure +layout provides sticky global nav actions before route components consume them.'
	)
}
