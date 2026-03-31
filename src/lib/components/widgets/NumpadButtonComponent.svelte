<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { ButtonColor } from './ButtonTypes'

	let {
		color = 'gray',
		disabled = false,
		square = true,
		onclick,
		children,
		testId = undefined
	}: {
		color?: ButtonColor
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
	class="{square ? 'aspect-square' : 'w-full p-3 md:p-4'} rounded
	text-2xl text-stone-100 transition-all duration-200 ease-out outline-none
	hover:ring-2 hover:ring-stone-100 hover:ring-inset focus-visible:ring-2
        focus-visible:ring-inset active:scale-95 disabled:opacity-50 md:text-3xl"
	class:btn-blue={color === 'blue'}
	class:btn-green={color === 'green'}
	class:btn-red={color === 'red'}
	class:btn-gray={color === 'gray'}
>
	{@render children()}
</button>
