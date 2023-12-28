<script lang="ts">
	export let value: number | string | undefined
	export let hiddenValue: number
	export let showHiddenValue: boolean
	export let strong = false
	export let color: 'blue' | 'red' = 'blue'
</script>

{#if hiddenValue !== value}
	<button
		type="button"
		on:click={() => (showHiddenValue = !showHiddenValue)}
		class="cursor-pointer {strong ? 'font-semibold' : ''} {showHiddenValue
			? 'text-green-700'
			: `text-${color}-800`}"
	>
		{showHiddenValue ? hiddenValue : value}
		<span class="sr-only"
			>{showHiddenValue ? 'Vis opprinnelig verdi' : 'Vis skjult verdi'}</span
		>
	</button>
{:else}
	<span class="font-semibold text-blue-800 {strong ? 'font-semibold' : ''}"
		>{value}</span
	>
{/if}
