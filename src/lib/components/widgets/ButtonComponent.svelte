<script lang="ts">
	import type { Snippet } from 'svelte'
	import { btnColorClass } from '$lib/constants/StyleConstants'

	let {
		color = 'blue',
		size = 'default',
		title = null,
		testId = undefined,
		disabled = false,
		margin = false,
		onclick,
		children
	}: {
		color?: 'red' | 'blue' | 'yellow' | 'green' | 'gray'
		size?: 'default' | 'small' | 'large'
		title?: string | null
		testId?: string | undefined
		disabled?: boolean
		margin?: boolean
		onclick?: (e: MouseEvent) => void
		children: Snippet
	} = $props()

	const sizeClass: Record<string, string> = {
		small: 'px-4 py-2 text-xl',
		default: 'px-5 py-3 text-2xl',
		large: 'px-6 py-4 text-3xl'
	}
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
	class="{sizeClass[
		size
	]} rounded-md font-light text-stone-100 outline-none hover:text-white focus:text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-100 dark:focus-visible:ring-offset-stone-900 {margin
		? 'mr-1'
		: ''} {btnColorClass[
		color
	]} transition-all duration-200 ease-out active:scale-95 disabled:opacity-50"
>
	{@render children()}
</button>
