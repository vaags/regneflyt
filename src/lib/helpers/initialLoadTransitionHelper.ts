import { onMount } from 'svelte'

export const noTransitionDuration = { duration: 0 } as const

export function shouldAllowInitialTransitions(): boolean {
	return (
		typeof document === 'undefined' ||
		!document.body.classList.contains('initial-load')
	)
}

// Combines the cold-boot check with the route-navigation-in-flight signal:
// entrance transitions are disabled during the app's initial load and while
// a route navigation is in flight (so a component remounted by navigation
// never replays its reveal animation), and enabled otherwise (so a reveal
// caused by user interaction on an already-settled route animates normally).
export function shouldAllowEntryTransitions(
	coldBootAllowed: boolean,
	routeNavigationInFlight: boolean
): boolean {
	return coldBootAllowed && !routeNavigationInFlight
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
): void {
	onMount(() => {
		return scheduleInitialLoadTransitionEnable(isEnabled(), onEnable)
	})
}
