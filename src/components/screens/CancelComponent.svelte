<script lang="ts">
	import ButtonComponent from '../widgets/ButtonComponent.svelte'

	export let showCompleteButton: boolean
	export let onAbortQuiz: () => void = () => {}
	export let onCompleteQuiz: () => void = () => {}
	let showWarning = false

	const toggleWarning = () => (showWarning = !showWarning)
	const abortQuiz = () => onAbortQuiz()
	const completeQuiz = () => onCompleteQuiz()
</script>

<div class="text-right text-lg text-gray-700 dark:text-gray-300">
	{#if showWarning}
		<span class="mr-1 text-gray-900 dark:text-gray-100">Avslutt?</span>
		<ButtonComponent size="small" color="red" on:click={abortQuiz}
			>Ja</ButtonComponent
		>
		<ButtonComponent size="small" on:click={toggleWarning}>Nei</ButtonComponent>
	{:else}
		{#if showCompleteButton}
			<ButtonComponent
				size="small"
				color="green"
				title="Fullfør quiz"
				on:click={completeQuiz}>&check;</ButtonComponent
			>
		{/if}
		<ButtonComponent
			size="small"
			color="red"
			title="Angre"
			on:click={toggleWarning}>&cross;</ButtonComponent
		>
	{/if}
</div>
