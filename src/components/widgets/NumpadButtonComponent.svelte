<script lang="ts">
	import type { Snippet } from 'svelte'

	let {
		color = 'gray',
		disabled = false,
		square = true,
		onclick,
		children
	}: {
		color?: 'red' | 'green' | 'yellow' | 'gray' | 'blue'
		disabled?: boolean
		square?: boolean
		onclick?: (e: MouseEvent) => void
		children: Snippet
	} = $props()
</script>

<button
	onclick={(e) => {
		e.preventDefault()
		onclick?.(e)
	}}
	{disabled}
	class="{square ? 'aspect-square' : 'w-full p-3 md:p-4'} rounded
     text-2xl text-gray-100 outline-none hover:ring-2 hover:ring-inset focus:ring-2
     focus:ring-inset md:text-3xl
        btn-{color} transition-all duration-200
        ease-out hover:ring-gray-100 {disabled ? 'opacity-50' : ''}"
>
	{@render children()}
</button>
