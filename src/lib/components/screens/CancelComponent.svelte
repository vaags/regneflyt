<script lang="ts">
	import { getContext } from 'svelte'
	import * as m from '$lib/paraglide/messages.js'
	import ButtonComponent from '../widgets/ButtonComponent.svelte'

	let { showCompleteButton }: { showCompleteButton: boolean } = $props()

	const onAbortQuiz = getContext<() => void>('abortQuiz')
	const onCompleteQuiz = getContext<() => void>('completeQuiz')
	let showWarning = $state(false)

	const toggleWarning = () => (showWarning = !showWarning)
	const abortQuiz = () => onAbortQuiz()
	const completeQuiz = () => onCompleteQuiz()
</script>

<div class="text-right text-lg text-stone-700 dark:text-stone-300">
	{#if showWarning}
		<span
			class="mr-1 text-stone-900 dark:text-stone-100"
			data-testid="cancel-confirm">{m.cancel_confirm()}</span
		>
		<ButtonComponent
			size="small"
			color="red"
			onclick={abortQuiz}
			testId="btn-cancel-yes">{m.button_yes()}</ButtonComponent
		>
		<ButtonComponent size="small" onclick={toggleWarning}
			>{m.button_no()}</ButtonComponent
		>
	{:else}
		{#if showCompleteButton}
			<ButtonComponent
				size="small"
				color="green"
				title={m.cancel_complete_quiz()}
				testId="btn-complete-quiz"
				onclick={completeQuiz}>✓</ButtonComponent
			>
		{/if}
		<ButtonComponent
			size="small"
			color="red"
			title={m.cancel_undo()}
			testId="btn-cancel"
			onclick={toggleWarning}>✗</ButtonComponent
		>
	{/if}
</div>
