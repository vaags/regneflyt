<script lang="ts">
	import { slide } from 'svelte/transition'
	import { Operator } from '$lib/constants/Operator'
	import { AppSettings } from '$lib/constants/AppSettings'
	import type { Quiz } from '$lib/models/Quiz'
	import AdditionSubtractionPanel from './AdditionSubtractionPanel.svelte'
	import MultiplicationDivisionPanel from './MultiplicationDivisionPanel.svelte'
	import PuzzleTypePanel from './PuzzleTypePanel.svelte'

	const operatorOptions = [
		Operator.Addition,
		Operator.Subtraction,
		Operator.Multiplication,
		Operator.Division
	] as const

	let {
		quiz = $bindable(),
		isAllOperators,
		hasInvalidAdditionRange,
		hasInvalidSubtractionRange
	}: {
		quiz: Quiz
		isAllOperators: boolean
		hasInvalidAdditionRange: boolean
		hasInvalidSubtractionRange: boolean
	} = $props()
</script>

<div transition:slide={AppSettings.transitionDuration}>
	{#each operatorOptions as operator}
		{#if operator === quiz.selectedOperator || isAllOperators}
			<div transition:slide={AppSettings.transitionDuration}>
				{#if operator === Operator.Addition || operator === Operator.Subtraction}
					<AdditionSubtractionPanel
						{operator}
						{isAllOperators}
						{hasInvalidAdditionRange}
						{hasInvalidSubtractionRange}
						bind:rangeMin={quiz.operatorSettings[operator]!.range[0]}
						bind:rangeMax={quiz.operatorSettings[operator]!.range[1]}
						bind:allowNegativeAnswers={quiz.allowNegativeAnswers}
					/>
				{:else}
					<MultiplicationDivisionPanel
						{operator}
						{isAllOperators}
						bind:possibleValues={
							quiz.operatorSettings[operator]!.possibleValues
						}
					/>
				{/if}
			</div>
		{/if}
	{/each}
	<PuzzleTypePanel bind:quizPuzzleMode={quiz.puzzleMode} />
</div>
