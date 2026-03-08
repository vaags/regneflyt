<script lang="ts">
	import type { Snippet } from 'svelte'

	let {
		color = 'blue',
		size = 'default',
		title = null,
		disabled = false,
		margin = false,
		onclick,
		children
	}: {
		color?: 'red' | 'blue' | 'yellow' | 'green' | 'gray'
		size?: 'default' | 'small'
		title?: string | null
		disabled?: boolean
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
	class="
		rounded-md font-light text-gray-100
		{size === 'small' ? 'px-3 py-1 text-xl' : 'px-5 pt-1.5 pb-2 text-3xl'}
		outline-none hover:text-white focus:text-white
		focus:ring-4 focus:ring-inset
		focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 dark:focus-visible:ring-offset-gray-900
		{margin
		? 'mr-1'
		: ''} btn-{color} transition-all duration-200 ease-out {disabled
		? 'opacity-50'
		: ''}"
>
	{@render children()}
</button>
