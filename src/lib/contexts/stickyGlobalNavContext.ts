import { getContext, setContext } from 'svelte'

export type StickyGlobalNavStartActions = {
	onStart: () => void
	onReplay?: (() => void) | undefined
	canCopyLink?: (() => boolean) | undefined
	getCopyLinkSearchParams?: (() => URLSearchParams) | undefined
}

export type StickyGlobalNavQuizNextButtonColor = 'red' | 'green' | 'gray'

export type StickyGlobalNavQuizControls = {
	value: number | undefined
	disabled: boolean
	disabledNext: boolean
	nextButtonColor: StickyGlobalNavQuizNextButtonColor
	onValueChange: (value: number | undefined) => void
	onCompletePuzzle: () => void
}

export type StickyGlobalNavContext = {
	registerStartActions: (actions: StickyGlobalNavStartActions) => () => void
	setQuizControls: (controls: StickyGlobalNavQuizControls | undefined) => void
}

const stickyGlobalNavContextKey = Symbol('sticky-global-nav-context')

export function setStickyGlobalNavContext(context: StickyGlobalNavContext) {
	setContext(stickyGlobalNavContextKey, context)
}

export function getStickyGlobalNavContext() {
	const context = getContext<StickyGlobalNavContext | undefined>(
		stickyGlobalNavContextKey
	)

	if (context) return context

	throw new Error(
		'Sticky global nav context is not registered. Ensure +layout provides sticky global nav actions before route components consume them.'
	)
}
