<script lang="ts">
	import { slide } from 'svelte/transition'
	import { AppSettings } from '$lib/constants/AppSettings'
	import { button_close } from '$lib/paraglide/messages.js'
	import type { Snippet } from 'svelte'

	let {
		color = 'blue',
		dismissable = false,
		title = undefined,
		children
	}: {
		color?: 'red' | 'blue' | 'yellow'
		dismissable?: boolean
		title?: string
		children: Snippet
	} = $props()

	const alertColorClass: Record<string, string> = {
		blue: 'alert-blue',
		yellow: 'alert-yellow',
		red: 'alert-red'
	}

	let visible = $state(true)
</script>

{#if visible}
	<div class="relative" transition:slide={AppSettings.transitionDuration}>
		<div class="border-l-4 p-4 {alertColorClass[color]} text-lg" role="alert">
			{#if title}
				<div class="mb-2 font-semibold">{title}</div>
			{/if}
			<p>{@render children()}</p>
			{#if dismissable}
				<button
					class="absolute top-1 right-1.5 p-1 leading-none text-current opacity-60 transition-opacity hover:opacity-100"
					aria-label={button_close()}
					onclick={() => (visible = false)}>&times;</button
				>
			{/if}
		</div>
	</div>
{/if}
