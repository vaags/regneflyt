<script lang="ts">
	import { createEventDispatcher } from 'svelte'

	export let showCompleteButton: boolean
	const dispatch = createEventDispatcher()
	let showWarning = false

	const toggleWarning = () => (showWarning = !showWarning)
	const abortQuiz = () => dispatch('abortQuiz')
	const completeQuiz = () => dispatch('completeQuiz')
</script>

<div class="mx-auto mt-3 text-right text-xs text-gray-600">
	{#if showWarning}
		<span class="mr-1 text-gray-900">Ønsker du å avbryte?</span>
		<button
			class="rounded border border-red-800 px-2 py-0.5 text-red-800"
			on:click|preventDefault={abortQuiz}
			color="red">Ja</button
		>
		<button
			class="rounded border border-blue-800 px-2 py-0.5 text-blue-800"
			on:click|preventDefault={toggleWarning}>Nei</button
		>
	{:else}
		{#if showCompleteButton}
			<button
				class="rounded border border-green-800 px-2 py-0.5 text-green-800"
				on:click|preventDefault={completeQuiz}>&check;</button
			>
		{/if}
		<button
			class="rounded border border-red-800 px-2 py-0.5 text-red-800"
			on:click|preventDefault={toggleWarning}
			color="gray">&cross;</button
		>
	{/if}
</div>
