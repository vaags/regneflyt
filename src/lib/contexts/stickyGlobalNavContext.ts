import { getContext, setContext } from 'svelte'

export type StickyGlobalNavStartActions = {
	onStart: () => void
	onReplay?: (() => void) | undefined
	canCopyLink?: (() => boolean) | undefined
	getCopyLinkSearchParams?: (() => URLSearchParams) | undefined
}

export type StickyGlobalNavContext = {
	registerStartActions: (actions: StickyGlobalNavStartActions) => () => void
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
