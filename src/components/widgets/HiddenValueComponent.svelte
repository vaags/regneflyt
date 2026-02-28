<script lang="ts">
	export let value: number | string | undefined
	export let hiddenValue: number
	export let showHiddenValue: boolean
	export let interactive: boolean = true
	export let strong = false
	export let color: 'blue' | 'red' = 'blue'

	// compute display text and classes to avoid duplicating markup
	$: display = showHiddenValue ? hiddenValue : value
	// keep display computed; classes will be inlined in the template for Tailwind
</script>

{#if hiddenValue !== value}
	<button
		type="button"
		on:click|preventDefault={() => (showHiddenValue = !showHiddenValue)}
		disabled={!interactive}
		class="{interactive ? 'cursor-pointer' : 'cursor-default'} {strong
			? 'font-semibold'
			: ''} {showHiddenValue
			? 'text-green-700 dark:text-green-300'
			: color === 'blue'
				? 'text-blue-800 dark:text-blue-300'
				: 'text-red-800 dark:text-red-300'}"
	>
		{display}
		<span class="sr-only"
			>{showHiddenValue ? 'Vis opprinnelig verdi' : 'Vis skjult verdi'}</span
		>
	</button>
{:else}
	<span class="font-semibold text-blue-800 dark:text-blue-300">{value}</span>
{/if}
