<script lang="ts">
	let {
		value,
		hiddenValue,
		showHiddenValue = $bindable(false),
		interactive = true,
		strong = false,
		color = 'blue'
	}: {
		value: number | string | undefined
		hiddenValue: number
		showHiddenValue?: boolean
		interactive?: boolean
		strong?: boolean
		color?: 'blue' | 'red'
	} = $props()

	let display = $derived(showHiddenValue ? hiddenValue : value)
</script>

{#if hiddenValue !== value}
	<button
		type="button"
		onclick={(e) => {
			e.preventDefault()
			showHiddenValue = !showHiddenValue
		}}
		disabled={!interactive}
		class="{interactive ? 'cursor-pointer' : 'cursor-default'} {strong
			? 'font-semibold'
			: ''} {showHiddenValue
			? 'text-green-700 dark:text-green-400'
			: color === 'blue'
				? 'text-blue-800 dark:text-blue-400'
				: 'text-red-800 dark:text-red-400'}"
	>
		{display}
		<span class="sr-only"
			>{showHiddenValue ? 'Vis opprinnelig verdi' : 'Vis skjult verdi'}</span
		>
	</button>
{:else}
	<span class="font-semibold text-blue-800 dark:text-blue-400">{value}</span>
{/if}
