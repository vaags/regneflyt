<script lang="ts">
	import {
		sr_show_hidden_value,
		sr_show_original_value
	} from '#lib/paraglide/messages.js'

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
		aria-pressed={showHiddenValue}
		onclick={(e) => {
			e.preventDefault()
			showHiddenValue = !showHiddenValue
		}}
		disabled={!interactive}
		class="hidden-value focus-indicator expanded-hit-area"
		data-revealed={showHiddenValue || undefined}
		data-color={color}
		data-strong={strong || undefined}
		data-interactive={interactive || undefined}
	>
		{display}
		<span class="visually-hidden"
			>{showHiddenValue
				? sr_show_original_value()
				: sr_show_hidden_value()}</span
		>
	</button>
{:else}
	<span class="static">{value}</span>
{/if}

<style>
	.hidden-value {
		border-radius: 0.25rem;
		background: transparent;
		color: var(--color-primary-800);

		&[data-color='red'] {
			color: var(--color-danger-800);
		}

		&[data-revealed='true'] {
			color: var(--color-positive-700);
		}

		&[data-strong='true'] {
			font-weight: 600;
		}

		&:not([data-interactive='true']) {
			cursor: default;
		}
	}

	.static {
		color: var(--color-primary-800);
		font-weight: 600;
	}

	:global(.dark) {
		& .hidden-value {
			color: var(--color-primary-400);

			&[data-color='red'] {
				color: var(--color-danger-400);
			}

			&[data-revealed='true'] {
				color: var(--color-positive-400);
			}
		}

		& .static {
			color: var(--color-primary-400);
		}
	}
</style>
