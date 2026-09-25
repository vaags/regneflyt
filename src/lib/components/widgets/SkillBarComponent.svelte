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
	<div class="header">
		<span>{label}</span>
		<span class="value-group">
			<span class="value">{Math.round(value)}%</span>
			{#if showDelta && delta !== undefined}
				<span
					class="delta"
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
		class="track"
		role="progressbar"
		aria-valuenow={Math.round(value)}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-label={label}
	>
		<div
			style="width: {Math.max(0, Math.min(100, value))}%"
			class="fill"
			data-animated={animated || undefined}
		></div>
	</div>
</div>

<style>
	.skill-bar {
		margin-block-end: 0.5rem;

		& .header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-block-end: 0.25rem;
			color: var(--color-text-primary);
			font-size: 0.875rem;
		}

		& .value-group {
			display: flex;
			align-items: baseline;
			justify-content: flex-end;
		}

		& .value,
		& .delta {
			font-weight: 600;
		}

		& .delta {
			display: inline-block;
			margin-inline-start: 0.25rem;
			overflow: hidden;
			font-size: 0.75rem;
			white-space: nowrap;

			&[data-direction='positive'] {
				color: var(--color-positive-900);
			}

			&[data-direction='negative'] {
				color: var(--color-danger-800);
			}

			&[data-direction='neutral'] {
				color: var(--color-text-secondary);
			}
		}

		& .track {
			display: flex;
			inline-size: 100%;
			block-size: 0.5rem;
			overflow: hidden;
			border-radius: 9999px;
			background: var(--color-surface-subtle);
		}

		& .fill {
			block-size: 100%;
			border-radius: 9999px;
			background: var(--color-primary-600);

			&[data-animated='true'] {
				transition: width 700ms ease-out;
			}
		}
	}

	:global(.dark) .skill-bar {
		& .delta[data-direction='positive'] {
			color: var(--color-positive-400);
		}

		& .delta[data-direction='negative'] {
			color: var(--color-danger-300);
		}

		& .header {
			color: var(--color-neutral-200);
		}

		& .fill {
			background: var(--color-primary-400);
		}
	}
</style>
