<script lang="ts">
	import { slide } from 'svelte/transition'
	import { label_no_change } from '$lib/paraglide/messages.js'

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
		class="mb-1 flex items-center justify-between text-sm text-stone-800 dark:text-stone-300"
	>
		<span>{label}</span>
		<span class="flex items-baseline justify-end">
			<span class="font-semibold">{Math.round(value)}%</span>
			{#if showDelta && delta !== undefined}
				<span
					class="ml-1 inline-block overflow-hidden text-xs font-semibold whitespace-nowrap {delta >
					0
						? 'text-emerald-900 dark:text-emerald-400'
						: delta < 0
							? 'text-red-600 dark:text-red-400'
							: 'text-stone-700 dark:text-stone-300'}"
					transition:slide={{ axis: 'x', duration: 300 }}
				>
					{delta > 0
						? `+${delta}`
						: delta < 0
							? String(delta)
							: `(${label_no_change()})`}
				</span>
			{/if}
		</span>
	</div>
	<div
		class="flex h-2 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700"
		role="progressbar"
		aria-valuenow={Math.round(value)}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-label={label}
	>
		<div
			style="width: {Math.max(0, Math.min(100, value))}%"
			class="h-full rounded-full bg-sky-600 dark:bg-sky-400"
			class:skill-bar-fill-animated={animated}
		></div>
	</div>
</div>

<style>
	.skill-bar-fill-animated {
		transition: width 700ms ease-out;
	}
</style>
