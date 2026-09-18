<script lang="ts">
	import { getOperatorSign } from '#lib/domain/arithmetic/operator.ts'
	import type { Puzzle } from '#lib/domain/puzzle-generation/puzzle.ts'
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
			<span class="puzzle-result__incorrect">({part.userDefinedValue})</span>
		{/if}
	{:else}{part.generatedValue}{/if}
	{#if i === 0}
		<span class="puzzle-result__operator"
			>{getOperatorSign(puzzle.operator)}</span
		>
	{:else if i === 1}
		<span class="puzzle-result__operator">=</span>
	{/if}
{/each}

<style>
	.puzzle-result__incorrect {
		color: var(--color-danger-900);
	}

	.puzzle-result__operator {
		margin-inline-end: 0.25rem;
	}

	:global(.dark) .puzzle-result__incorrect {
		color: var(--color-danger-300);
	}
</style>
