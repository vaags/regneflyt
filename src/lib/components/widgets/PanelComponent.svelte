<script lang="ts">
	import { untrack } from 'svelte'
	import type { Snippet } from 'svelte'
	import { slide } from 'svelte/transition'
	import { AppSettings } from '$lib/constants/AppSettings'
	import ChevronDownComponent from '../icons/ChevronDownComponent.svelte'
	import LabelComponent from './LabelComponent.svelte'

	let {
		heading = undefined,
		headingTestId = undefined,
		label = undefined,
		labelSnippet,
		collapsible = true,
		initiallyCollapsed = false,
		children
	}: {
		heading?: string | undefined
		headingTestId?: string | undefined
		label?: string | undefined
		labelSnippet?: Snippet
		collapsible?: boolean
		initiallyCollapsed?: boolean
		children: Snippet
	} = $props()

	let expanded = $state(untrack(() => !initiallyCollapsed))
	const headingClass =
		'font-handwriting text-3xl text-stone-900 md:text-4xl dark:text-stone-300'
	let chevronClass = $derived(
		`h-8 w-8 transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`
	)
	let collapsibleAriaLabel = $derived(heading ?? label ?? '')

	function toggleExpanded() {
		expanded = !expanded
	}
</script>

<section class="panel-stack-gap">
	<div class="panel-surface rounded-md px-6 py-5 md:px-8 md:py-7">
		{#snippet panelLabel()}
			{#if label !== undefined}
				<LabelComponent>{label}</LabelComponent>
			{:else if labelSnippet}
				{@render labelSnippet()}
			{/if}
		{/snippet}

		{#snippet panelChevron()}
			<ChevronDownComponent className={chevronClass} />
		{/snippet}

		{#if heading || label !== undefined || labelSnippet || collapsible}
			{#if collapsible && heading}
				<h2 data-testid={headingTestId}>
					<button
						type="button"
						onclick={toggleExpanded}
						aria-expanded={expanded}
						aria-label={heading}
						data-panel-toggle="true"
						class="group flex min-h-11 w-full items-center justify-between rounded-sm bg-transparent p-0 text-left focus-visible:ring-2 focus-visible:ring-sky-300"
					>
						<span class={headingClass}>
							{heading}
						</span>
						<span class="flex items-center gap-1">
							{@render panelLabel()}
							<span
								class="-mt-10 -mr-5 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md leading-none text-stone-600 group-hover:text-stone-900 md:-mt-13 md:-mr-6 dark:text-stone-400 dark:group-hover:text-stone-100"
							>
								{@render panelChevron()}
							</span>
						</span>
					</button>
				</h2>
			{:else}
				<div class="flex items-center justify-between">
					{#if heading}
						<h2 class={headingClass} data-testid={headingTestId}>
							{heading}
						</h2>
					{/if}
					<div class="flex items-center gap-1">
						{@render panelLabel()}
						{#if collapsible}
							<button
								type="button"
								onclick={toggleExpanded}
								aria-expanded={expanded}
								aria-label={collapsibleAriaLabel}
								data-panel-toggle="true"
								class="-mt-10 -mr-6 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md leading-none text-stone-600 hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-sky-300 md:-mt-13 md:-mr-7 dark:text-stone-400 dark:hover:text-stone-100 dark:focus-visible:ring-sky-400"
							>
								{@render panelChevron()}
							</button>
						{/if}
					</div>
				</div>
			{/if}
		{/if}
		{#if !collapsible || expanded}
			<div
				transition:slide={AppSettings.transitionDuration}
				class="mt-5 md:mt-6"
			>
				{@render children()}
			</div>
		{/if}
	</div>
</section>
