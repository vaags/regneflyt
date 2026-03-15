<script lang="ts">
	import * as m from '$lib/paraglide/messages.js'

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
		class="relative {!interactive ? 'cursor-default' : ''} {strong
			? 'font-semibold'
			: ''} {showHiddenValue
			? 'text-emerald-700 dark:text-emerald-400'
			: color === 'blue'
				? 'text-sky-800 dark:text-sky-400'
				: 'text-red-800 dark:text-red-400'} after:absolute after:top-1/2 after:left-1/2 after:min-h-11 after:min-w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']"
	>
		{display}
		<span class="sr-only"
			>{showHiddenValue
				? m.sr_show_original_value()
				: m.sr_show_hidden_value()}</span
		>
	</button>
{:else}
	<span class="font-semibold text-sky-800 dark:text-sky-400">{value}</span>
{/if}
