<script lang="ts">
	import type { Snippet } from 'svelte'
	import { btnColorClass } from '$lib/constants/StyleConstants'

	let {
		color = 'gray',
		disabled = false,
		square = true,
		onclick,
		children,
		testId = undefined
	}: {
		color?: 'red' | 'green' | 'yellow' | 'gray' | 'blue'
		disabled?: boolean
		square?: boolean
		onclick?: (e: MouseEvent) => void
		children: Snippet
		testId?: string | undefined
	} = $props()
</script>

<button
	onclick={(e) => {
		e.preventDefault()
		onclick?.(e)
	}}
	{disabled}
	data-testid={testId}
	class="{square ? 'aspect-square' : 'w-full p-3'} rounded
     text-2xl text-stone-100 outline-none hover:ring-2 hover:ring-inset focus:ring-2
     focus:ring-inset md:text-3xl
        {btnColorClass[color]} transition-all duration-200
        ease-out hover:ring-stone-100 active:scale-95 disabled:opacity-50"
>
	{@render children()}
</button>
