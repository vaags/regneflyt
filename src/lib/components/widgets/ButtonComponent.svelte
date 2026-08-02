<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { ResolvedPathname } from '$app/types'
	import {
		type ButtonSize,
		type ButtonColor,
		type ButtonVariant,
		buttonSolidColorClass,
		buttonOutlineColorClass,
		buttonOutlineBorderClass,
		buttonSizeClass
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

	const solidColorClass = $derived(
		variant === 'solid' ? buttonSolidColorClass[color] : ''
	)
	const outlineColorClass = $derived(
		variant === 'outline' ? buttonOutlineColorClass[color] : ''
	)
	const outlineBorderClass = $derived(
		variant === 'outline' ? buttonOutlineBorderClass[color] : ''
	)

	// Shared so the anchor and button branches cannot drift apart.
	const appearanceClass = $derived(
		[
			'btn-interactive-base inline-flex items-center justify-center rounded-md active:translate-y-px active:scale-97',
			solidColorClass,
			outlineColorClass,
			outlineBorderClass,
			fullWidth ? 'w-full' : '',
			buttonSizeClass[size],
			variant === 'solid' ? 'btn-solid-content' : 'border'
		]
			.filter((entry) => entry !== '')
			.join(' ')
	)
</script>

{#if href !== undefined}
	<!-- eslint-disable svelte/no-navigation-without-resolve -- the ResolvedPathname type already forces the caller to pass resolve() output -->
	<a
		{href}
		{title}
		aria-label={ariaLabel}
		data-testid={testId}
		class={appearanceClass}
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
		class="{appearanceClass} disabled:opacity-50"
	>
		{@render children()}
	</button>
{/if}
