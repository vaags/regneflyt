<script lang="ts">
	import { button_results } from '$lib/paraglide/messages.js'
	import ButtonComponent from '../widgets/ButtonComponent.svelte'
	import StartQuizActionButton from './StartQuizActionButton.svelte'

	let {
		onStart,
		onReplay = undefined,
		onShowResults = undefined
	}: {
		onStart: () => void
		onReplay?: (() => void) | undefined
		onShowResults?: (() => void) | undefined
	} = $props()
</script>

<nav class="flex justify-between" data-testid="menu-actions">
	<StartQuizActionButton {onReplay} {onStart} />
	<div class="flex gap-2 md:gap-3">
		{#if onShowResults}
			<ButtonComponent onclick={onShowResults} color="gray" testId="btn-results"
				>{button_results()}</ButtonComponent
			>
		{/if}
	</div>
</nav>
