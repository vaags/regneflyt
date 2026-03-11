<script lang="ts">
	import * as m from '$lib/paraglide/messages.js'
	import ButtonComponent from '../widgets/ButtonComponent.svelte'

	let {
		showSettings,
		onStart,
		onShare,
		onShowResults = undefined,
		onShowSettings
	}: {
		showSettings: boolean
		onStart: () => void
		onShare: () => void
		onShowResults?: (() => void) | undefined
		onShowSettings: () => void
	} = $props()
</script>

<nav class="flex justify-between" data-testid="menu-actions">
	<ButtonComponent onclick={onStart} color="green" testId="btn-start"
		>{m.button_start()}</ButtonComponent
	>
	<div class="flex gap-2 md:gap-3">
		{#if onShowResults}
			<ButtonComponent onclick={onShowResults} color="gray" testId="btn-results"
				>{m.button_results()}</ButtonComponent
			>
		{/if}
		{#if showSettings}
			<ButtonComponent
				onclick={onShare}
				color="gray"
				size="small"
				testId="btn-share"
			>
				{m.button_share()}
			</ButtonComponent>
		{:else}
			<ButtonComponent color="gray" onclick={onShowSettings} testId="btn-menu">
				{m.button_menu()}
			</ButtonComponent>
		{/if}
	</div>
</nav>
