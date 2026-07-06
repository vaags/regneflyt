<script lang="ts">
	import type { Snippet } from 'svelte'
	import {
		type ButtonSize,
		type ButtonColor,
		type ButtonVariant,
		buttonSolidColorClass,
		buttonOutlineColorClass,
		buttonOutlineBorderClass
	} from './ButtonTypes'

	let {
		color = 'blue',
		variant = 'solid',
		size = 'medium',
		title = null,
		testId = undefined,
		disabled = false,
		fullWidth = false,
		margin = false,
		onclick,
		children
	}: {
		color?: ButtonColor
		variant?: ButtonVariant
		size?: ButtonSize
		title?: string | null
		testId?: string | undefined
		disabled?: boolean
		fullWidth?: boolean
		margin?: boolean
		onclick?: (e: MouseEvent) => void
		children: Snippet
	} = $props()

	const solidColorClass = $derived(
		variant === 'solid' ? buttonSolidColorClass[color] : ''
	)
	const outlineColorClass = $derived(
		variant === 'outline' ? buttonOutlineColorClass[color] : ''
	)
	const outlineBorderClass = $derived(
		variant === 'outline' ? buttonOutlineBorderClass[color] : ''
	)
</script>

<button
	type="button"
	onclick={(e) => {
		e.preventDefault()
		onclick?.(e)
	}}
	aria-label={title}
	{title}
	{disabled}
	data-testid={testId}
	class="btn-interactive-base inline-flex items-center justify-center rounded-md active:translate-y-px active:scale-97 disabled:opacity-50 {solidColorClass} {outlineColorClass} {outlineBorderClass}"
	class:mr-1={margin}
	class:w-full={fullWidth}
	class:btn-size-small={size === 'small'}
	class:btn-size-medium={size === 'medium'}
	class:btn-size-large={size === 'large'}
	class:btn-solid-content={variant === 'solid'}
	class:border={variant === 'outline'}
>
	{@render children()}
</button>
