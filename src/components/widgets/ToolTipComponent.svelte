<!-- This is not in use atm -->
<script lang="ts">
	import { fade } from 'svelte/transition'
	export let tip: string
	export let isActive = false
</script>

<button
	class="relative cursor-pointer border-b border-dashed border-gray-500"
	on:click={() => (isActive = !isActive)}
>
	<slot />
	{#if isActive}
		<span
			transition:fade={{ duration: 150 }}
			class="absolute -top-8 -left-10 w-48 rounded border border-gray-400 bg-white px-2 py-1"
			>{tip}</span
		>
	{/if}
</button>
