<script lang="ts">
	import { slide } from 'svelte/transition'
	import * as m from '$lib/paraglide/messages.js'

	let {
		label,
		value,
		delta = undefined,
		showDelta = true,
		animated = true,
		testId = undefined
	}: {
		label: string
		value: number
		delta?: number | undefined
		showDelta?: boolean
		animated?: boolean
		testId?: string | undefined
	} = $props()
</script>

<div class="mb-2" data-testid={testId}>
	<div
		class="mb-1 flex items-center justify-between text-sm text-gray-800 dark:text-gray-300"
	>
		<span>{label}</span>
		<span class="flex items-baseline justify-end">
			<span class="font-semibold">{Math.round(value)}%</span>
			{#if showDelta && delta !== undefined}
				<span
					class="ml-1 inline-block overflow-hidden text-xs font-semibold whitespace-nowrap {delta >
					0
						? 'text-green-900 dark:text-green-400'
						: delta < 0
							? 'text-red-600 dark:text-red-400'
							: 'text-gray-700 dark:text-gray-300'}"
					transition:slide={{ axis: 'x', duration: 300 }}
				>
					{delta > 0
						? `+${delta}`
						: delta < 0
							? String(delta)
							: `(${m.label_no_change()})`}
				</span>
			{/if}
		</span>
	</div>
	<div
		class="flex h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
		role="progressbar"
		aria-valuenow={Math.round(value)}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-label={label}
	>
		<div
			class="h-2 rounded-full bg-blue-600 dark:bg-blue-400 {animated
				? 'transition-all duration-700 ease-out'
				: ''}"
			style="width: {value}%"
		></div>
	</div>
</div>
