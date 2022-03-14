<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import ButtonComponent from './widgets/ButtonComponent.svelte'

	export let showCompleteButton: boolean
	const dispatch = createEventDispatcher()
	let showWarning = false

	const toggleWarning = () => (showWarning = !showWarning)
	const abortQuiz = () => dispatch('abortQuiz')
	const completeQuiz = () => dispatch('completeQuiz')
</script>

<div class="float-right text-right">
	{#if showWarning}
		<p class="mb-2 text-lg text-gray-100">Ønsker du å avbryte?</p>
		<ButtonComponent on:click={abortQuiz} color="red" margin={true}>Ja</ButtonComponent>
		<ButtonComponent on:click={toggleWarning}>Nei</ButtonComponent>
	{:else}
		{#if showCompleteButton}
			<ButtonComponent on:click={completeQuiz} margin={true}>Fullfør</ButtonComponent>
		{/if}
		<ButtonComponent on:click={toggleWarning} color="gray">Avbryt</ButtonComponent>
	{/if}
</div>
