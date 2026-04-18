<script lang="ts">
	import { slide } from 'svelte/transition'
	import { AppSettings } from '$lib/constants/AppSettings'
	import {
		button_start_training,
		heading_onboarding,
		onboarding_intro
	} from '$lib/paraglide/messages.js'
	import {
		getInitialLoadTransitionConfig,
		setupInitialLoadTransitionGate,
		shouldAllowInitialTransitions
	} from '$lib/helpers/initialLoadTransitionHelper'
	import ButtonComponent from '../widgets/ButtonComponent.svelte'
	import PanelComponent from '../widgets/PanelComponent.svelte'

	let {
		onDismiss,
		testId = 'onboarding-panel'
	}: {
		onDismiss: () => void | Promise<void>
		testId?: string
	} = $props()

	let allowInitialTransitions = $state(shouldAllowInitialTransitions())

	function getSlideTransitionConfig() {
		return getInitialLoadTransitionConfig(
			allowInitialTransitions,
			AppSettings.transitionDuration
		)
	}

	setupInitialLoadTransitionGate(
		() => allowInitialTransitions,
		() => {
			allowInitialTransitions = true
		}
	)
</script>

<div transition:slide={getSlideTransitionConfig()} data-testid={testId}>
	<PanelComponent
		heading={heading_onboarding()}
		headingTestId="heading-onboarding"
		collapsible={false}
	>
		<p class="text-lg text-stone-800 dark:text-stone-200">
			{onboarding_intro()}
		</p>
		<div class="mt-6">
			<ButtonComponent
				color="green"
				fullWidth={true}
				title={button_start_training()}
				testId="btn-onboarding-dismiss"
				onclick={() => void onDismiss()}
			>
				{button_start_training()}
			</ButtonComponent>
		</div>
	</PanelComponent>
</div>
