<script lang="ts">
	export let color: 'red' | 'green' | 'gray' = 'gray'
	export let disabled: boolean = false
</script>

<button
	on:click|preventDefault
	{disabled}
	class="
    rounded border border-gray-800 p-3 
     text-2xl text-gray-100 outline-none
     hover:text-white focus:text-white focus:outline-none focus:ring-2 focus:ring-inset
        btn-{color} transition-all
        duration-200 ease-out {disabled ? 'opacity-50' : ''}"
>
	<slot />
</button>
