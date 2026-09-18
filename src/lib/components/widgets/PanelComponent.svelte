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

<section class="panel-stack" data-panel-stack>
	<div class="panel" data-panel-surface>
		{#snippet panelLabel()}
			{#if label !== undefined}
				<LabelComponent>{label}</LabelComponent>
			{:else if labelSnippet}
				{@render labelSnippet()}
			{/if}
		{/snippet}

		{#snippet panelToggleIcon()}
			<span class="panel__chevron" data-expanded={expanded || undefined}>
				<ChevronDownComponent />
			</span>
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
						class="panel__heading-toggle focus-indicator"
					>
						<span class="panel__heading">
							{heading}
						</span>
						<span class="panel__heading-actions">
							{@render panelLabel()}
							{@render panelToggleIcon()}
						</span>
					</button>
				</h2>
			{:else}
				<div class="panel__heading-row">
					{#if heading}
						<h2 class="panel__heading" data-testid={headingTestId}>
							{heading}
						</h2>
					{/if}
					<div class="panel__heading-actions">
						{@render panelLabel()}
						{#if collapsible}
							<button
								type="button"
								onclick={toggleExpanded}
								aria-expanded={expanded}
								aria-label={collapsibleAriaLabel}
								data-panel-toggle="true"
								class="panel__standalone-toggle focus-indicator"
							>
								{@render panelToggleIcon()}
							</button>
						{/if}
					</div>
				</div>
			{/if}
		{/if}
		{#if !collapsible || expanded}
			<div transition:slide={getSlideTransitionConfig()} class="panel__content">
				{@render children()}
			</div>
		{/if}
	</div>
</section>

<style>
	.panel-stack {
		padding-block-end: var(--panel-stack-gap);
	}

	.panel {
		padding: 1.25rem 1.5rem;
		border: 1px solid var(--color-surface-border);
		border-radius: var(--radius-control);
		background: var(--color-surface);
		color: var(--color-text-primary);
		box-shadow: var(--shadow-panel);
	}

	.panel__heading-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		inline-size: 100%;
		min-inline-size: 0;
		min-block-size: var(--target-minimum);
		gap: 0.5rem;
		border-radius: 0.125rem;
		background: transparent;
		text-align: start;
	}

	.panel__heading-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.panel__heading {
		min-inline-size: 0;
		color: var(--color-text-primary);
		font-family: var(--font-handwriting);
		font-size: 1.875rem;
		font-weight: 400;
		line-height: 2.25rem;
		overflow-wrap: anywhere;
	}

	.panel__heading-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		min-inline-size: 0;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.panel__chevron,
	.panel__standalone-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-inline-size: var(--target-minimum);
		min-block-size: var(--target-minimum);
		margin-block-start: -2.5rem;
		border-radius: var(--radius-control);
		color: var(--color-text-muted);
		font-size: 2rem;
		line-height: 1;
	}

	.panel__chevron {
		transition: transform 150ms;
	}

	.panel__heading-toggle:hover .panel__chevron,
	.panel__standalone-toggle:hover {
		color: var(--color-text-primary);
	}

	.panel__chevron[data-expanded='true'] {
		transform: rotate(180deg);
	}

	.panel__standalone-toggle {
		background: transparent;
	}

	.panel__content {
		margin-block-start: 1.25rem;
	}

	@media (min-width: 40rem) {
		.panel__chevron,
		.panel__standalone-toggle {
			margin-inline-end: -1.25rem;
		}
	}

	@media (min-width: 48rem) {
		.panel {
			padding: 1.75rem 2rem;
		}

		.panel__heading {
			font-size: 2.25rem;
			line-height: 2.5rem;
		}

		.panel__chevron,
		.panel__standalone-toggle {
			margin-block-start: -3.25rem;
			margin-inline-end: -1.5rem;
		}

		.panel__content {
			margin-block-start: 1.5rem;
		}
	}
</style>
