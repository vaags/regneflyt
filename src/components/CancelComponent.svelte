<script lang="ts">
	import { createEventDispatcher } from 'svelte'

	export let showCompleteButton: boolean
	const dispatch = createEventDispatcher()
	let showWarning = false

	const toggleWarning = () => (showWarning = !showWarning)
	const abortQuiz = () => dispatch('abortQuiz')
	const completeQuiz = () => dispatch('completeQuiz')
</script>

<div class="mx-auto text-right text-sm text-gray-600">
	{#if showWarning}
		<span class="mr-1 text-gray-900">Ønsker du å avbryte?</span>
		<button
			class="rounded border border-red-700 px-2 py-0.5 text-red-700"
			on:click|preventDefault={abortQuiz}
			color="red">Ja</button
		>
		<button
			class="rounded border border-blue-700 px-2 py-0.5 text-blue-700"
			on:click|preventDefault={toggleWarning}>Nei</button
		>
	{:else}
		{#if showCompleteButton}
			<button
				class="rounded border border-green-700 px-2 py-0.5 text-green-700"
				on:click|preventDefault={completeQuiz}>&check;</button
			>
		{/if}
		<button
			class="rounded border border-red-700 px-2 py-0.5 text-red-700"
			on:click|preventDefault={toggleWarning}
			color="gray">&cross;</button
		>
	{/if}
</div>
