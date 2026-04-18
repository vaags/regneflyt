import { onMount } from 'svelte'

export const noTransitionDuration = { duration: 0 } as const

export function shouldAllowInitialTransitions(): boolean {
	return (
		typeof document === 'undefined' ||
		!document.body.classList.contains('initial-load')
	)
}

export function scheduleInitialLoadTransitionEnable(
	enabled: boolean,
	onEnable: () => void
): (() => void) | undefined {
	if (enabled || typeof window === 'undefined') return undefined

	const frame = window.requestAnimationFrame(onEnable)
	return () => {
		window.cancelAnimationFrame(frame)
	}
}

export function getInitialLoadTransitionConfig<T extends { duration: number }>(
	enabled: boolean,
	activeConfig: T
): T | typeof noTransitionDuration {
	return enabled ? activeConfig : noTransitionDuration
}

export function setupInitialLoadTransitionGate(
	isEnabled: () => boolean,
	onEnable: () => void
) {
	onMount(() => {
		return scheduleInitialLoadTransitionEnable(isEnabled(), onEnable)
	})
}
