<script lang="ts">
	export let color: 'red' | 'green' | 'yellow' | 'gray' | 'blue' = 'gray'
	export let disabled: boolean = false
	export let puzzleTimeout: boolean = false
	export let square: boolean = true
</script>

<button
	on:click|preventDefault
	{disabled}
	class="{puzzleTimeout ? 'animate-pulse' : ''} {square
		? 'aspect-square'
		: 'w-full p-3 md:p-4'} rounded
     text-2xl text-gray-100 outline-none focus:ring-2
     focus:ring-inset md:text-3xl
        btn-{color} transition-all
        duration-200 ease-out {disabled ? 'opacity-50' : ''}"
>
	<slot />
</button>
