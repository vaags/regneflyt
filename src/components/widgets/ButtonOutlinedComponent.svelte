<script lang="ts">
	export let large = false
	export let title: string | null = null
</script>

<button
	on:click|preventDefault
	class="rounded-md border border-blue-800 bg-white px-4 py-2 text-lg text-blue-900 transition-colors hover:bg-blue-700 hover:text-white {large
		? 'text-xl'
		: ''}"
	aria-label={title}><slot /></button
>
