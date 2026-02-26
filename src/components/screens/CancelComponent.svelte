<script lang="ts">
	import { createEventDispatcher } from 'svelte'

	export let showCompleteButton: boolean
	const dispatch = createEventDispatcher()
	let showWarning = false

	const toggleWarning = () => (showWarning = !showWarning)
	const abortQuiz = () => dispatch('abortQuiz')
	const completeQuiz = () => dispatch('completeQuiz')
</script>

<div class="text-right text-sm text-gray-700">
	{#if showWarning}
		<span class="mr-1 text-gray-900">Avslutt?</span>
		<button
			class="rounded border border-red-800 px-3 py-1 text-red-800 focus:ring-2 focus:ring-red-300 focus:outline-none"
			on:click|preventDefault={abortQuiz}
			color="red">Ja</button
		>
		<button
			class="rounded border border-blue-800 px-3 py-1 text-blue-800 focus:ring-2 focus:ring-blue-300 focus:outline-none"
			on:click|preventDefault={toggleWarning}>Nei</button
		>
	{:else}
		{#if showCompleteButton}
			<button
				aria-label="Fullfør quiz"
				class="min-h-11 min-w-11 rounded border border-green-800 px-2 py-1 text-lg leading-none text-green-800 focus:ring-2 focus:ring-green-300 focus:outline-none"
				on:click|preventDefault={completeQuiz}>&check;</button
			>
		{/if}
		<button
			aria-label="Angre"
			class="min-h-11 min-w-11 rounded border border-red-800 px-2 py-1 text-lg leading-none text-red-800 focus:ring-2 focus:ring-red-300 focus:outline-none"
			on:click|preventDefault={toggleWarning}
			color="gray">&cross;</button
		>
	{/if}
</div>
