import type { StickyGlobalNavStartActions } from '$lib/contexts/stickyGlobalNavContext'

export function registerStickyStartActions(
	actions: StickyGlobalNavStartActions,
	options: {
		getCurrentToken: () => number
		setToken: (token: number) => void
		setActions: (value: StickyGlobalNavStartActions | undefined) => void
		resetToken: () => void
	}
): () => void {
	const token = options.getCurrentToken() + 1
	options.setToken(token)
	options.setActions(actions)

	return () => {
		if (options.getCurrentToken() !== token) return
		options.setActions(undefined)
		options.resetToken()
	}
}

export function resolveStickyStartAction(
	startActions: StickyGlobalNavStartActions | undefined,
	fallback: () => void
): () => void {
	return startActions?.onStart ?? fallback
}

export function resolveStickyReplayAction(
	startActions: StickyGlobalNavStartActions | undefined,
	hasReplayableResults: boolean,
	fallback: () => void
): (() => void) | undefined {
	if (startActions?.onReplay) return startActions.onReplay
	return hasReplayableResults ? fallback : undefined
}
