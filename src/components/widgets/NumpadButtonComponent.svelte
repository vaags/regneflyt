<script lang="ts">
	export let color: 'red' | 'green' | 'yellow' | 'gray' = 'gray'
	export let disabled: boolean = false
	export let puzzleTimeout: boolean = false
</script>

<button
	on:click|preventDefault
	{disabled}
	class="{puzzleTimeout ? 'animate-pulse' : ''} 
    w-full rounded p-4
     text-2xl text-gray-100 outline-none
     focus:ring-2 focus:ring-inset
        btn-{color} transition-all
        duration-200 ease-out {disabled ? 'opacity-50' : ''}"
>
	<slot />
</button>
