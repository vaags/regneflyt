<script lang="ts">
	import { untrack } from 'svelte'
	import type { Snippet } from 'svelte'
	import { slide } from 'svelte/transition'
	import { AppSettings } from '#lib/constants/AppSettings.ts'
	import { getPanelExpandedState } from '#lib/stores.ts'
	import { createInitialLoadSlideTransitionState } from '#lib/helpers/initialLoadTransitionState.svelte.ts'
	import ChevronDownComponent from '../icons/ChevronDownComponent.svelte'
	import LabelComponent from './LabelComponent.svelte'

	type PanelSharedProps = {
		heading?: string | undefined
		headingTestId?: string | undefined
		label?: string | undefined
		labelSnippet?: Snippet
		initiallyCollapsed?: boolean
		children: Snippet
	}

	// stateKey is required whenever the panel is collapsible: it backs the
	// session-scoped expanded/collapsed state that must survive component
	// remounts caused by route navigation. Non-collapsible panels have no
	// toggle to persist, so stateKey is disallowed for them.
	type PanelProps =
		| (PanelSharedProps & { collapsible?: true; stateKey: string })
		| (PanelSharedProps & { collapsible: false; stateKey?: undefined })

	let {
		heading = undefined,
		headingTestId = undefined,
		label = undefined,
		labelSnippet,
		collapsible = true,
		initiallyCollapsed = false,
		stateKey = undefined,
		children
	}: PanelProps = $props()

	const panelExpandedState = untrack(() =>
		stateKey ? getPanelExpandedState(stateKey, !initiallyCollapsed) : undefined
	)

	// panelExpandedState is guaranteed to exist whenever expanded's value is
	// actually consumed: PanelProps requires stateKey whenever collapsible is
	// true, and non-collapsible panels never read expanded (they always take
	// the `!collapsible` branch below). The `true` fallback here is therefore
	// never actually observed.
	let expanded = $derived(
		panelExpandedState ? panelExpandedState.current : true
	)
	const headingClass =
		'font-handwriting text-3xl text-stone-900 md:text-4xl dark:text-stone-100'
	let chevronClass = $derived(
		`h-8 w-8 transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`
	)
	let collapsibleAriaLabel = $derived(heading ?? label ?? '')

	function toggleExpanded() {
		if (!panelExpandedState) return
		panelExpandedState.current = !panelExpandedState.current
	}

	// Suppresses the collapse/expand slide transition for one frame after mount
	// so it never replays merely because a route navigation remounted this
	// panel; genuine user-driven toggles still animate normally.
	const getSlideTransitionConfig = createInitialLoadSlideTransitionState(
		AppSettings.transitionDuration
	)
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

		{#snippet panelToggleIcon(containerClass?: string)}
			{#if containerClass}
				<span class={containerClass}>
					{@render panelChevron()}
				</span>
			{:else}
				{@render panelChevron()}
			{/if}
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
						class="focus-ring group flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-sm bg-transparent p-0 text-left"
					>
						<span class="min-w-0 wrap-break-word {headingClass}">
							{heading}
						</span>
						<span class="flex min-w-0 flex-wrap items-center justify-end gap-1">
							{@render panelLabel()}
							{@render panelToggleIcon(
								'-mt-10 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md leading-none text-stone-600 group-hover:text-stone-900 sm:-mr-5 md:-mt-13 md:-mr-6 dark:text-stone-300 dark:group-hover:text-stone-100'
							)}
						</span>
					</button>
				</h2>
			{:else}
				<div class="flex flex-wrap items-start justify-between gap-2">
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
								class="focus-ring -mt-10 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md leading-none text-stone-600 hover:text-stone-900 sm:-mr-5 md:-mt-13 md:-mr-6 dark:text-stone-300 dark:hover:text-stone-100"
							>
								{@render panelToggleIcon()}
							</button>
						{/if}
					</div>
				</div>
			{/if}
		{/if}
		{#if !collapsible || expanded}
			<div transition:slide={getSlideTransitionConfig()} class="mt-5 md:mt-6">
				{@render children()}
			</div>
		{/if}
	</div>
</section>
