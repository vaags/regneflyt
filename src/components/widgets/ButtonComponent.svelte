<script lang="ts">
	export let color: 'red' | 'blue' | 'yellow' | 'green' | 'gray' = 'blue'
	export let disabled: boolean = false
	export let margin: boolean = false
</script>

<button
	on:click|preventDefault
	{disabled}
	class="
    rounded-tl-lg rounded-br-lg border-b-2 border-r border-l-4 px-4 pt-1 
     pb-1.5 text-3xl font-light text-gray-100 outline-none
     hover:text-white focus:text-white focus:outline-none focus:ring-2 focus:ring-inset
        {margin ? 'mr-1' : ''} btn-{color} transition-all
        duration-200 ease-out {disabled ? 'opacity-50' : ''}"
>
	<slot />
</button>
