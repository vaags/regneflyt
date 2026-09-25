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

	let visible = $state(true)
</script>

{#if visible}
	<div class="alert-wrapper" transition:slide={AppSettings.transitionDuration}>
		<div
			class="alert"
			data-color={color}
			data-testid={testId}
			role={announce ? 'alert' : undefined}
		>
			{#if title}
				<div class="title">{title}</div>
			{/if}
			<p>{@render children()}</p>
			{#if dismissable}
				<button
					type="button"
					class="dismiss focus-indicator expanded-hit-area"
					aria-label={button_close()}
					onclick={() => (visible = false)}>&times;</button
				>
			{/if}
		</div>
	</div>
{/if}

<style>
	.alert-wrapper {
		position: relative;
	}

	.alert {
		padding: 1rem;
		border-inline-start: 4px solid;
		font-size: 1.125rem;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);

		&[data-color='blue'] {
			border-color: var(--color-primary-500);
			background: var(--color-primary-100);
			color: var(--color-primary-900);
		}

		&[data-color='yellow'] {
			border-color: var(--color-warning-500);
			background: var(--color-warning-100);
			color: var(--color-warning-900);
		}

		&[data-color='red'] {
			border-color: var(--color-danger-500, #ef4444);
			background: var(--color-danger-100);
			color: var(--color-danger-900);
		}

		& .title {
			margin-block-end: 0.5rem;
			font-weight: 600;
		}

		& .dismiss {
			position: absolute;
			top: 0.25rem;
			inset-inline-end: 0.375rem;
			padding: 0.25rem;
			border-radius: 0.25rem;
			background: transparent;
			color: currentcolor;
			line-height: 1;
			opacity: 0.6;
			transition: opacity 150ms;

			&:hover,
			&:focus-visible {
				opacity: 1;
			}
		}
	}

	:global(.dark) .alert {
		box-shadow: var(--shadow-elevated);

		&[data-color='blue'] {
			background: var(--color-primary-900);
			color: var(--color-primary-100);
		}

		&[data-color='yellow'] {
			background: var(--color-warning-900);
			color: var(--color-warning-100);
		}

		&[data-color='red'] {
			background: var(--color-danger-900);
			color: var(--color-danger-100);
		}
	}
</style>
