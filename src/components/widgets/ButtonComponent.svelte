<script lang="ts">
	import type { Snippet } from 'svelte'

	let {
		variant = 'filled',
		color = 'blue',
		size = 'default',
		title = null,
		testId = undefined,
		disabled = false,
		margin = false,
		onclick,
		children
	}: {
		variant?: 'filled' | 'outlined'
		color?: 'red' | 'blue' | 'yellow' | 'green' | 'gray'
		size?: 'default' | 'small' | 'large'
		title?: string | null
		testId?: string | undefined
		disabled?: boolean
		margin?: boolean
		onclick?: (e: MouseEvent) => void
		children: Snippet
	} = $props()

	const filledSizeClass: Record<string, string> = {
		small: 'px-3 py-1 text-xl',
		default: 'px-5 pt-1.5 pb-2 text-3xl',
		large: 'px-5 pt-1.5 pb-2 text-3xl'
	}

	const outlinedSizeClass: Record<string, string> = {
		small: 'px-3 py-1 text-sm',
		default: 'px-5 py-2.5 text-lg',
		large: 'px-5 py-2.5 text-xl'
	}

	let sizeClass = $derived(
		variant === 'outlined' ? outlinedSizeClass[size] : filledSizeClass[size]
	)
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
	class="{sizeClass} {variant === 'outlined'
		? 'rounded-md border border-blue-800 bg-white text-blue-900 transition-colors outline-none hover:bg-blue-700 hover:text-white focus-visible:ring-4 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 dark:border-blue-400 dark:bg-gray-700 dark:text-blue-200 dark:hover:bg-blue-700 dark:hover:text-white dark:focus-visible:ring-offset-gray-900'
		: `rounded-md font-light text-gray-100 outline-none hover:text-white focus:text-white focus:ring-4 focus:ring-inset focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 dark:focus-visible:ring-offset-gray-900 ${margin ? 'mr-1' : ''} btn-${color} transition-all duration-200 ease-out ${disabled ? 'opacity-50' : ''}`}"
>
	{@render children()}
</button>
