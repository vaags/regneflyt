<script lang="ts">
	export let color: 'red' | 'blue' | 'yellow' | 'green' | 'gray' = 'blue'
	export let disabled = false
	export let margin = false
</script>

<button
	on:click|preventDefault
	{disabled}
	class="
		rounded-md px-5 pt-1.5 pb-2 text-3xl font-light text-gray-100
		outline-none hover:text-white focus:text-white
		focus:ring-4 focus:ring-inset
		focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 dark:focus-visible:ring-offset-gray-900
		{margin
		? 'mr-1'
		: ''} btn-{color} transition-all duration-200 ease-out {disabled
		? 'opacity-50'
		: ''}"
>
	<slot />
</button>
