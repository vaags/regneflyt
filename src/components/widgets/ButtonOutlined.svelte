<script lang="ts">
	export let large: boolean = false
</script>

<button
	on:click|preventDefault
	class="rounded-md border border-blue-800 bg-white py-2 px-4 text-lg text-blue-900 transition-colors hover:bg-blue-700 hover:text-white {large
		? 'text-xl'
		: ''}"><slot /></button
>
