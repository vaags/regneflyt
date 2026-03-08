<script lang="ts">
	import { getContext } from 'svelte'
	import * as m from '$lib/paraglide/messages.js'
	import ButtonComponent from '../widgets/ButtonComponent.svelte'

	export let showCompleteButton: boolean

	const onAbortQuiz = getContext<() => void>('abortQuiz')
	const onCompleteQuiz = getContext<() => void>('completeQuiz')
	let showWarning = false

	const toggleWarning = () => (showWarning = !showWarning)
	const abortQuiz = () => onAbortQuiz()
	const completeQuiz = () => onCompleteQuiz()
</script>

<div class="text-right text-lg text-gray-700 dark:text-gray-300">
	{#if showWarning}
		<span class="mr-1 text-gray-900 dark:text-gray-100"
			>{m.cancel_confirm()}</span
		>
		<ButtonComponent size="small" color="red" on:click={abortQuiz}
			>{m.button_yes()}</ButtonComponent
		>
		<ButtonComponent size="small" on:click={toggleWarning}
			>{m.button_no()}</ButtonComponent
		>
	{:else}
		{#if showCompleteButton}
			<ButtonComponent
				size="small"
				color="green"
				title={m.cancel_complete_quiz()}
				on:click={completeQuiz}>&check;</ButtonComponent
			>
		{/if}
		<ButtonComponent
			size="small"
			color="red"
			title={m.cancel_undo()}
			on:click={toggleWarning}>&cross;</ButtonComponent
		>
	{/if}
</div>
