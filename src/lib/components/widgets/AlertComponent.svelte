<script lang="ts">
	import { slide } from 'svelte/transition'
	import { AppSettings } from '#lib/constants/AppSettings.ts'
	import { button_close } from '#lib/paraglide/messages.js'
	import type { Snippet } from 'svelte'

	let {
		color = 'blue',
		dismissable = false,
		announce = true,
		title = undefined,
		testId = undefined,
		children
	}: {
		color?: 'red' | 'blue' | 'yellow'
		dismissable?: boolean
		/**
		 * Set false when the alert is an empty state rather than a problem, or when
		 * a surrounding live region already owns the announcement.
		 */
		announce?: boolean
		title?: string
		testId?: string | undefined
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
		<div
			class="border-l-4 p-4 {alertColorClass[color]} text-lg"
			data-testid={testId}
			role={announce ? 'alert' : undefined}
		>
			{#if title}
				<div class="mb-2 font-semibold">{title}</div>
			{/if}
			<p>{@render children()}</p>
			{#if dismissable}
				<button
					type="button"
					class="focus-ring-surface absolute top-1 right-1.5 rounded p-1 leading-none text-current opacity-60 transition-opacity after:absolute after:top-1/2 after:left-1/2 after:min-h-11 after:min-w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-[''] hover:opacity-100 focus-visible:opacity-100"
					aria-label={button_close()}
					onclick={() => (visible = false)}>&times;</button
				>
			{/if}
		</div>
	</div>
{/if}
