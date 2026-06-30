<script lang="ts">
	import { getOperatorSign } from '$lib/constants/Operator'
	import type { Puzzle } from '$lib/models/Puzzle'
	import HiddenValueComponent from './HiddenValueComponent.svelte'

	let {
		puzzle,
		showCorrectAnswer,
		showIncorrectSubmittedValue = false
	}: {
		puzzle: Puzzle
		showCorrectAnswer: boolean
		showIncorrectSubmittedValue?: boolean
	} = $props()
</script>

{#each puzzle.parts as part, i (i)}
	{#if puzzle.unknownPartIndex === i}
		<HiddenValueComponent
			value={part.userDefinedValue}
			showHiddenValue={showCorrectAnswer}
			hiddenValue={part.generatedValue}
			color="red"
			strong={true}
		/>
		{#if showIncorrectSubmittedValue && showCorrectAnswer && !puzzle.isCorrect}
			<span class="text-red-900 dark:text-red-300"
				>({part.userDefinedValue})</span
			>
		{/if}
	{:else}{part.generatedValue}{/if}
	{#if i === 0}
		<span class="mr-1">{getOperatorSign(puzzle.operator)}</span>
	{:else if i === 1}
		<span class="mr-1">=</span>
	{/if}
{/each}
