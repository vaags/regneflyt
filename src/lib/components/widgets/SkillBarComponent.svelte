<script lang="ts">
	import { slide } from 'svelte/transition'
	import { label_no_change } from '#lib/paraglide/messages.js'

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

	let deltaDirection = $derived(
		delta === undefined || delta === 0
			? 'neutral'
			: delta > 0
				? 'positive'
				: 'negative'
	)
</script>

<div class="skill-bar" data-testid={testId}>
	<div class="skill-bar__header">
		<span>{label}</span>
		<span class="skill-bar__value-group">
			<span class="skill-bar__value">{Math.round(value)}%</span>
			{#if showDelta && delta !== undefined}
				<span
					class="skill-bar__delta"
					data-direction={deltaDirection}
					data-testid={testId === undefined ? undefined : `${testId}-delta`}
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
		class="skill-bar__track"
		role="progressbar"
		aria-valuenow={Math.round(value)}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-label={label}
	>
		<div
			style="width: {Math.max(0, Math.min(100, value))}%"
			class="skill-bar__fill"
			data-animated={animated || undefined}
		></div>
	</div>
</div>

<style>
	.skill-bar {
		margin-block-end: 0.5rem;
	}

	.skill-bar__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-block-end: 0.25rem;
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}

	.skill-bar__value-group {
		display: flex;
		align-items: baseline;
		justify-content: flex-end;
	}

	.skill-bar__value,
	.skill-bar__delta {
		font-weight: 600;
	}

	.skill-bar__delta {
		display: inline-block;
		margin-inline-start: 0.25rem;
		overflow: hidden;
		font-size: 0.75rem;
		white-space: nowrap;
	}

	.skill-bar__delta[data-direction='positive'] {
		color: var(--color-positive-900);
	}

	.skill-bar__delta[data-direction='negative'] {
		color: var(--color-danger-800);
	}

	.skill-bar__delta[data-direction='neutral'] {
		color: var(--color-text-secondary);
	}

	.skill-bar__track {
		display: flex;
		inline-size: 100%;
		block-size: 0.5rem;
		overflow: hidden;
		border-radius: 9999px;
		background: var(--color-surface-subtle);
	}

	.skill-bar__fill {
		block-size: 100%;
		border-radius: 9999px;
		background: var(--color-primary-600);
	}

	.skill-bar__fill[data-animated='true'] {
		transition: width 700ms ease-out;
	}

	:global(.dark) .skill-bar__delta[data-direction='positive'] {
		color: var(--color-positive-400);
	}

	:global(.dark) .skill-bar__delta[data-direction='negative'] {
		color: var(--color-danger-300);
	}

	:global(.dark) .skill-bar__fill {
		background: var(--color-primary-400);
	}
</style>
