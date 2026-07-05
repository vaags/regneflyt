import {
	getInitialLoadTransitionConfig,
	setupInitialLoadTransitionGate,
	shouldAllowEntryTransitions,
	shouldAllowInitialTransitions
} from './initialLoadTransitionHelper'
import { routeNavigationInFlight } from '$lib/stores'

export function createInitialLoadSlideTransitionState<
	T extends { duration: number }
>(activeConfig: T): () => T | { readonly duration: 0 } {
	// Starts disabled during the app's cold boot and during any in-flight
	// route navigation, so entrance transitions never replay merely because a
	// route change remounted this component. Outside of those windows (e.g. a
	// panel appearing because the user just completed a setup step on an
	// already-settled route), transitions are allowed immediately. A brief
	// post-mount frame re-enables transitions afterwards in case this mount
	// happened to start inside one of those windows.
	let allowInitialTransitions = $state(
		shouldAllowEntryTransitions(
			shouldAllowInitialTransitions(),
			routeNavigationInFlight.current
		)
	)

	setupInitialLoadTransitionGate(
		() => allowInitialTransitions,
		() => {
			allowInitialTransitions = true
		}
	)

	return () =>
		getInitialLoadTransitionConfig(allowInitialTransitions, activeConfig)
}
