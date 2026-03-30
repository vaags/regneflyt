<script lang="ts">
	import { button_replay, button_start } from '$lib/paraglide/messages.js'
	import type { Locale } from '$lib/paraglide/runtime.js'
	import ButtonComponent from '../widgets/ButtonComponent.svelte'
	import SplitButtonComponent from '../widgets/SplitButtonComponent.svelte'

	let {
		onStart,
		onReplay = undefined,
		locale = undefined,
		fullWidth = false
	}: {
		onStart: () => void
		onReplay?: (() => void) | undefined
		locale?: Locale | undefined
		fullWidth?: boolean
	} = $props()

	const startLabel = $derived(
		locale ? button_start({}, { locale }) : button_start()
	)

	const replayLabel = $derived(
		locale ? button_replay({}, { locale }) : button_replay()
	)
</script>

{#if onReplay}
	<SplitButtonComponent
		onclick={onStart}
		onSecondaryClick={onReplay}
		secondaryLabel={replayLabel}
		color="green"
		{fullWidth}
		testId="btn-start"
	>
		{startLabel}
	</SplitButtonComponent>
{:else}
	<ButtonComponent
		onclick={onStart}
		color="green"
		{fullWidth}
		testId="btn-start">{startLabel}</ButtonComponent
	>
{/if}
