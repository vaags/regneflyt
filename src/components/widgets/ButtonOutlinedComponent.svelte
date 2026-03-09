<script lang="ts">
	import type { Snippet } from 'svelte'

	let {
		large = false,
		small = false,
		title = null,
		onclick,
		children
	}: {
		large?: boolean
		small?: boolean
		title?: string | null
		onclick?: (e: MouseEvent) => void
		children: Snippet
	} = $props()
</script>

<button
	onclick={(e) => {
		e.preventDefault()
		onclick?.(e)
	}}
	class="rounded-md border border-blue-800 bg-white text-blue-900 transition-colors outline-none hover:bg-blue-700 hover:text-white focus-visible:ring-4 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 dark:border-blue-400 dark:bg-gray-700 dark:text-blue-200 dark:hover:bg-blue-700 dark:hover:text-white dark:focus-visible:ring-offset-gray-900 {small
		? 'px-3 py-1 text-sm'
		: large
			? 'px-5 py-2.5 text-xl'
			: 'px-5 py-2.5 text-lg'}"
	aria-label={title}>{@render children()}</button
>
