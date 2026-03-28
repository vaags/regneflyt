<script lang="ts">
	import {
		button_menu,
		button_replay,
		button_results,
		button_share,
		button_start
	} from '$lib/paraglide/messages.js'
	import ButtonComponent from '../widgets/ButtonComponent.svelte'
	import SplitButtonComponent from '../widgets/SplitButtonComponent.svelte'

	let {
		onStart,
		onReplay = undefined,
		onShare,
		disableShare = false,
		onShowResults = undefined
	}: {
		onStart: () => void
		onReplay?: (() => void) | undefined
		onShare: () => void
		disableShare?: boolean
		onShowResults?: (() => void) | undefined
	} = $props()
</script>

<nav class="flex justify-between" data-testid="menu-actions">
	{#if onReplay}
		<SplitButtonComponent
			onclick={onStart}
			onSecondaryClick={onReplay}
			secondaryLabel={button_replay()}
			color="green"
			testId="btn-start"
		>
			{button_start()}
		</SplitButtonComponent>
	{:else}
		<ButtonComponent onclick={onStart} color="green" testId="btn-start"
			>{button_start()}</ButtonComponent
		>
	{/if}
	<div class="flex gap-2 md:gap-3">
		{#if onShowResults}
			<ButtonComponent onclick={onShowResults} color="gray" testId="btn-results"
				>{button_results()}</ButtonComponent
			>
		{/if}
		<ButtonComponent
			onclick={onShare}
			color="gray"
			size="small"
			disabled={disableShare}
			testId="btn-share"
		>
			{button_share()}
		</ButtonComponent>
	</div>
</nav>
