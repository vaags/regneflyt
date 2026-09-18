<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { ResolvedPathname } from '$app/types'
	import {
		type ButtonSize,
		type ButtonColor,
		type ButtonVariant
	} from './ButtonTypes'

	type ButtonSharedProps = {
		color?: ButtonColor
		variant?: ButtonVariant
		size?: ButtonSize
		title?: string | null
		/**
		 * Only for buttons whose children are an icon or symbol. Text buttons must
		 * leave this unset so the visible label is the accessible name.
		 */
		ariaLabel?: string | undefined
		testId?: string | undefined
		fullWidth?: boolean
		children: Snippet
	}

	/**
	 * `href` renders an anchor, for actions that change route. An anchor cannot be
	 * disabled or carry a click handler, so those are excluded rather than
	 * silently ignored; hide or omit the link instead of trying to disable it.
	 */
	type ButtonProps =
		| (ButtonSharedProps & {
				href?: undefined
				disabled?: boolean
				onclick?: (e: MouseEvent) => void
		  })
		| (ButtonSharedProps & {
				href: ResolvedPathname
				disabled?: undefined
				onclick?: undefined
		  })

	let {
		color = 'blue',
		variant = 'solid',
		size = 'medium',
		title = null,
		ariaLabel = undefined,
		testId = undefined,
		disabled = false,
		fullWidth = false,
		href = undefined,
		onclick,
		children
	}: ButtonProps = $props()
</script>

{#if href !== undefined}
	<!-- eslint-disable svelte/no-navigation-without-resolve -- the ResolvedPathname type already forces the caller to pass resolve() output -->
	<a
		{href}
		{title}
		aria-label={ariaLabel}
		data-testid={testId}
		class="button focus-indicator"
		data-color={color}
		data-variant={variant}
		data-size={size}
		data-full-width={fullWidth || undefined}
	>
		{@render children()}
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{:else}
	<button
		type="button"
		onclick={(e) => {
			e.preventDefault()
			onclick?.(e)
		}}
		{title}
		aria-label={ariaLabel}
		{disabled}
		data-testid={testId}
		class="button focus-indicator"
		data-color={color}
		data-variant={variant}
		data-size={size}
		data-full-width={fullWidth || undefined}
	>
		{@render children()}
	</button>
{/if}

<style>
	.button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-inline-size: var(--target-minimum);
		border: 1px solid transparent;
		border-radius: var(--radius-control);
		font-weight: 400;
		line-height: 1;
		text-decoration: none;
		transition:
			transform 200ms ease-out,
			background-color 200ms ease-out,
			border-color 200ms ease-out,
			color 200ms ease-out,
			box-shadow 200ms ease-out,
			filter 200ms ease-out;
	}

	.button:active {
		transform: translateY(1px) scale(0.97);
	}

	.button:disabled {
		opacity: 0.5;
	}

	.button[data-full-width='true'] {
		inline-size: 100%;
	}

	.button[data-size='small'] {
		block-size: 2.75rem;
		padding-inline: 1rem;
		font-size: 1.25rem;
	}

	.button[data-size='medium'] {
		block-size: 3rem;
		padding-inline: 1.25rem;
		font-size: 1.5rem;
	}

	.button[data-size='large'] {
		block-size: 3.5rem;
		padding-inline: 1.5rem;
		font-size: 1.875rem;
	}

	.button[data-variant='solid'] {
		color: white;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
	}

	.button[data-variant='solid'][data-color='blue'] {
		border-color: var(--color-primary-950);
		background: var(--color-primary-900);
	}

	.button[data-variant='solid'][data-color='green'] {
		border-color: var(--color-positive-900);
		background: var(--color-positive-800);
	}

	.button[data-variant='solid'][data-color='red'] {
		border-color: var(--color-danger-900);
		background: var(--color-danger-800);
	}

	.button[data-variant='solid'][data-color='gray'] {
		border-color: var(--color-neutral-700);
		background: var(--color-neutral-600);
	}

	.button[data-variant='solid']:hover,
	.button[data-variant='solid']:active {
		filter: brightness(0.85);
	}

	.button[data-variant='outline'] {
		background: transparent;
		box-shadow: none;
	}

	.button[data-variant='outline'][data-color='blue'] {
		border-color: var(--color-primary-700);
		color: var(--color-primary-800);
	}

	.button[data-variant='outline'][data-color='green'] {
		border-color: var(--color-positive-700);
		color: var(--color-positive-800);
	}

	.button[data-variant='outline'][data-color='red'] {
		border-color: var(--color-danger-700);
		color: var(--color-danger-800);
	}

	.button[data-variant='outline'][data-color='gray'] {
		border-color: var(--color-neutral-600);
		color: var(--color-neutral-800);
	}

	.button[data-variant='outline']:hover {
		background: var(--color-surface-subtle);
	}

	.button[data-variant='outline']:active {
		background: var(--color-surface-strong);
		box-shadow: inset 0 2px 4px rgb(0 0 0 / 0.06);
	}

	:global(.dark) .button[data-variant='outline'][data-color='blue'] {
		border-color: var(--color-primary-400);
		color: var(--color-primary-200);
	}

	:global(.dark) .button[data-variant='outline'][data-color='green'] {
		border-color: var(--color-positive-400);
		color: var(--color-positive-200);
	}

	:global(.dark) .button[data-variant='outline'][data-color='red'] {
		border-color: var(--color-danger-400);
		color: var(--color-danger-200);
	}

	:global(.dark) .button[data-variant='outline'][data-color='gray'] {
		border-color: var(--color-neutral-400);
		color: var(--color-neutral-200);
	}

	:global(.dark) .button[data-variant='outline']:hover {
		background: var(--color-neutral-800);
	}

	:global(.dark) .button[data-variant='outline']:active {
		background: var(--color-neutral-700);
	}
</style>
