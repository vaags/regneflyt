<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { ButtonSize, ButtonColor, ButtonVariant } from './ButtonTypes'

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
</script>

<button
	onclick={(e) => {
		e.preventDefault()
		onclick?.(e)
	}}
	aria-label={title}
	{title}
	{disabled}
	data-testid={testId}
	class="btn-interactive-base inline-flex items-center justify-center rounded-md {fullWidth
		? 'w-full'
		: ''} {margin ? 'mr-1' : ''} active:scale-95 disabled:opacity-50"
	class:btn-size-small={size === 'small'}
	class:btn-size-medium={size === 'medium'}
	class:btn-size-large={size === 'large'}
	class:btn-blue={variant === 'solid' && color === 'blue'}
	class:btn-green={variant === 'solid' && color === 'green'}
	class:btn-red={variant === 'solid' && color === 'red'}
	class:btn-gray={variant === 'solid' && color === 'gray'}
	class:btn-solid-content={variant === 'solid'}
	class:border={variant === 'outline'}
	class:btn-outline-blue={variant === 'outline' && color === 'blue'}
	class:btn-outline-green={variant === 'outline' && color === 'green'}
	class:btn-outline-red={variant === 'outline' && color === 'red'}
	class:btn-outline-gray={variant === 'outline' && color === 'gray'}
	class:btn-outline-border-blue={variant === 'outline' && color === 'blue'}
	class:btn-outline-border-green={variant === 'outline' && color === 'green'}
	class:btn-outline-border-red={variant === 'outline' && color === 'red'}
	class:btn-outline-border-gray={variant === 'outline' && color === 'gray'}
>
	{@render children()}
</button>
