<script lang="ts">
	import { slide } from 'svelte/transition'
	import { AppSettings } from '#lib/constants/AppSettings.ts'
	import {
		button_start_training,
		heading_onboarding,
		onboarding_intro
	} from '#lib/paraglide/messages.js'
	import { createInitialLoadSlideTransitionState } from '#lib/helpers/initialLoadTransitionState.svelte.ts'
	import ButtonComponent from '../widgets/ButtonComponent.svelte'
	import PanelComponent from '../widgets/PanelComponent.svelte'

	let {
		onDismiss,
		testId = 'onboarding-panel'
	}: {
		onDismiss: () => void | Promise<void>
		testId?: string
	} = $props()

	const getSlideTransitionConfig = createInitialLoadSlideTransitionState(
		AppSettings.transitionDuration
	)
</script>

<div transition:slide={getSlideTransitionConfig()} data-testid={testId}>
	<PanelComponent
		heading={heading_onboarding()}
		headingTestId="heading-onboarding"
		collapsible={false}
	>
		<p>
			{onboarding_intro()}
		</p>
		<div class="actions">
			<ButtonComponent
				color="green"
				size="small"
				variant="solid"
				testId="btn-onboarding-dismiss"
				onclick={() => void onDismiss()}
			>
				{button_start_training()}
			</ButtonComponent>
		</div>
	</PanelComponent>
</div>

<style>
	p {
		color: var(--color-text-secondary);
		font-size: 1.125rem;
	}

	.actions {
		margin-block-start: 1.5rem;
	}
</style>
