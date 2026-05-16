import {
	getInitialLoadTransitionConfig,
	setupInitialLoadTransitionGate,
	shouldAllowInitialTransitions
} from './initialLoadTransitionHelper'

export function createInitialLoadSlideTransitionState<
	T extends { duration: number }
>(activeConfig: T): () => T | { readonly duration: 0 } {
	let allowInitialTransitions = $state(shouldAllowInitialTransitions())

	setupInitialLoadTransitionGate(
		() => allowInitialTransitions,
		() => {
			allowInitialTransitions = true
		}
	)

	return () =>
		getInitialLoadTransitionConfig(allowInitialTransitions, activeConfig)
}
