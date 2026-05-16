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
		quiz,
		isAllOperators,
		hasInvalidAdditionRange,
		hasInvalidSubtractionRange,
		onQuizChange
	}: {
		quiz: Quiz
		isAllOperators: boolean
		hasInvalidAdditionRange: boolean
		hasInvalidSubtractionRange: boolean
		onQuizChange: (quiz: Quiz) => void
	} = $props()

	type RangeOperator = typeof Operator.Addition | typeof Operator.Subtraction
	type TableOperator = typeof Operator.Multiplication | typeof Operator.Division

	function updateOperatorRange(
		operator: RangeOperator,
		range: [min: number, max: number]
	) {
		const nextOperatorSettings = [
			...quiz.operatorSettings
		] as Quiz['operatorSettings']
		nextOperatorSettings[operator] = {
			...nextOperatorSettings[operator],
			range
		}

		onQuizChange({
			...quiz,
			operatorSettings: nextOperatorSettings
		})
	}

	function updateTableValues(
		operator: TableOperator,
		possibleValues: number[]
	) {
		const nextOperatorSettings = [
			...quiz.operatorSettings
		] as Quiz['operatorSettings']
		nextOperatorSettings[operator] = {
			...nextOperatorSettings[operator],
			possibleValues
		}

		onQuizChange({
			...quiz,
			operatorSettings: nextOperatorSettings
		})
	}

	function updateAllowNegativeAnswers(allowNegativeAnswers: boolean) {
		onQuizChange({
			...quiz,
			allowNegativeAnswers
		})
	}

	function updateQuizPuzzleMode(quizPuzzleMode: Quiz['puzzleMode']) {
		onQuizChange({
			...quiz,
			puzzleMode: quizPuzzleMode
		})
	}
</script>

<div transition:slide={AppSettings.transitionDuration}>
	{#each operatorOptions as operator (operator)}
		{#if operator === quiz.selectedOperator || isAllOperators}
			<div transition:slide={AppSettings.transitionDuration}>
				{#if operator === Operator.Addition}
					{@const additionRange =
						quiz.operatorSettings[Operator.Addition].range}
					<AdditionSubtractionPanel
						{operator}
						{isAllOperators}
						{hasInvalidAdditionRange}
						{hasInvalidSubtractionRange}
						rangeMin={additionRange[0]}
						rangeMax={additionRange[1]}
						allowNegativeAnswers={quiz.allowNegativeAnswers}
						onRangeChange={(range) =>
							updateOperatorRange(Operator.Addition, range)}
						onAllowNegativeAnswersChange={updateAllowNegativeAnswers}
					/>
				{:else if operator === Operator.Subtraction}
					<AdditionSubtractionPanel
						{operator}
						{isAllOperators}
						{hasInvalidAdditionRange}
						{hasInvalidSubtractionRange}
						rangeMin={quiz.operatorSettings[Operator.Subtraction].range[0]}
						rangeMax={quiz.operatorSettings[Operator.Subtraction].range[1]}
						allowNegativeAnswers={quiz.allowNegativeAnswers}
						onRangeChange={(range) =>
							updateOperatorRange(Operator.Subtraction, range)}
						onAllowNegativeAnswersChange={updateAllowNegativeAnswers}
					/>
				{:else if operator === Operator.Multiplication}
					<MultiplicationDivisionPanel
						{operator}
						{isAllOperators}
						possibleValues={quiz.operatorSettings[Operator.Multiplication]
							.possibleValues}
						onPossibleValuesChange={(nextPossibleValues) =>
							updateTableValues(Operator.Multiplication, nextPossibleValues)}
					/>
				{:else if operator === Operator.Division}
					<MultiplicationDivisionPanel
						{operator}
						{isAllOperators}
						possibleValues={quiz.operatorSettings[Operator.Division]
							.possibleValues}
						onPossibleValuesChange={(nextPossibleValues) =>
							updateTableValues(Operator.Division, nextPossibleValues)}
					/>
				{/if}
			</div>
		{/if}
	{/each}
	<PuzzleTypePanel
		quizPuzzleMode={quiz.puzzleMode}
		onQuizPuzzleModeChange={updateQuizPuzzleMode}
	/>
</div>
