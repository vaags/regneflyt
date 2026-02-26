<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte'
	import { slide, fade } from 'svelte/transition'
	import ButtonComponent from '../widgets/ButtonComponent.svelte'
	import { Operator } from '../../models/constants/Operator'
	import type { Quiz } from '../../models/Quiz'
	import { getPuzzle } from '../../helpers/puzzleHelper'
	import {
		setUrlParams,
		getQuizDifficultySettings,
		getQuizTitle
	} from '../../helpers/quizHelper'
	import { AppSettings } from '../../models/constants/AppSettings'
	import type { Puzzle } from '../../models/Puzzle'
	import OperatorSelectionPanel from '../panels/OperatorSelectionPanel.svelte'
	import PuzzleTypePanel from '../panels/PuzzleTypePanel.svelte'
	import QuizDurationPanel from '../panels/QuizDurationPanel.svelte'
	import QuizPreviewPanel from '../panels/QuizPreviewPanel.svelte'
	import SharePanel from '../panels/SharePanel.svelte'
	import DifficultyPanel from '../panels/DifficultyPanel.svelte'
	import MultiplicationDivisionPanel from '../panels/MultiplicationDivisionPanel.svelte'
	import AdditionSubtractionPanel from '../panels/AdditionSubtractionPanel.svelte'
	import AlertComponent from '../widgets/AlertComponent.svelte'

	export let quiz: Quiz

	let quizHistoricState = { ...quiz }

	let showComponent = false
	let isMounted = false
	let puzzle: Puzzle
	const dispatch = createEventDispatcher()
	let showSharePanel: boolean
	let showSubmitValidationError: boolean

	$: isAllOperators = quiz.selectedOperator === 4
	$: hasInvalidAdditionRange = !rangeIsValid(
		quiz.operatorSettings[Operator.Addition].range
	)
	$: hasInvalidSubtractionRange = !rangeIsValid(
		quiz.operatorSettings[Operator.Subtraction].range
	)
	$: hasInvalidRange = hasInvalidAdditionRange || hasInvalidSubtractionRange

	$: missingPossibleValues =
		(quiz.selectedOperator === Operator.Multiplication ||
			quiz.selectedOperator === Operator.Division ||
			isAllOperators) &&
		(quiz.operatorSettings[Operator.Multiplication].possibleValues.length ==
			0 ||
			quiz.operatorSettings[Operator.Division].possibleValues.length == 0)

	$: validationError =
		missingPossibleValues ||
		hasInvalidRange ||
		quiz.selectedOperator === undefined ||
		(quiz.difficulty === undefined && quiz.showSettings) // For backwards-compatibility: Show start button for shared quiz, even with no difficulty-setting

	$: if (!validationError && quiz && isMounted) {
		updateQuizSettings()
		if (
			!(
				quizHistoricState.difficulty === quiz.difficulty &&
				(quizHistoricState.duration !== quiz.duration ||
					quizHistoricState.puzzleTimeLimit !== quiz.puzzleTimeLimit)
			)
		) {
			getPuzzlePreview() // Only generate new preview if relevant values have been changed (not just duration or puzzleTimeLimit)
		}
		quizHistoricState = { ...quiz }
	}

	const rangeIsValid = (range: [min: number, max: number]) =>
		range[0] < range[1]
	const getPuzzlePreview = () =>
		(puzzle = getPuzzle(quiz, AppSettings.operatorSigns, puzzle))

	function updateQuizSettings() {
		if (quiz.showSettings) setUrlParams(quiz)
	}

	const toggleSharePanel = () =>
		validationError
			? (showSubmitValidationError = true)
			: (showSharePanel = !showSharePanel)

	const getReady = () =>
		validationError
			? (showSubmitValidationError = true)
			: dispatch('getReady', { quiz })

	const setDifficultyLevel = (event: CustomEvent) => {
		quiz = getQuizDifficultySettings(quiz, event.detail.level, quiz.difficulty)
	}

	const hideWelcomePanel = () => dispatch('hideWelcomePanel')

	onMount(() => {
		isMounted = true

		setTimeout(() => {
			showComponent = true
		}, AppSettings.pageTransitionDuration.duration)

		if (quiz.showSettings && !validationError) updateQuizSettings()
	})
</script>

{#if showComponent}
	<form transition:fade={AppSettings.pageTransitionDuration}>
		{#if quiz.showSettings}
			<OperatorSelectionPanel
				bind:selectedOperator={quiz.selectedOperator}
				on:hideWelcomePanel={hideWelcomePanel}
			/>
			{#if quiz.selectedOperator !== undefined}
				<DifficultyPanel
					level={quiz.difficulty}
					on:setDifficultyLevel={setDifficultyLevel}
				/>
			{/if}
			{#if quiz.selectedOperator !== undefined && quiz.difficulty === 0}
				<div transition:slide={AppSettings.transitionDuration}>
					{#each Object.values(Operator) as operator}
						{#if operator === quiz.selectedOperator || isAllOperators}
							<div transition:slide={AppSettings.transitionDuration}>
								{#if operator === Operator.Addition || operator === Operator.Subtraction}
									<AdditionSubtractionPanel
										{operator}
										{isAllOperators}
										{hasInvalidAdditionRange}
										{hasInvalidSubtractionRange}
										bind:rangeMin={quiz.operatorSettings[operator].range[0]}
										bind:rangeMax={quiz.operatorSettings[operator].range[1]}
										bind:allowNegativeAnswers={quiz.allowNegativeAnswers}
									/>
								{:else}
									<MultiplicationDivisionPanel
										{operator}
										{isAllOperators}
										bind:possibleValues={
											quiz.operatorSettings[operator].possibleValues
										}
									/>
								{/if}
							</div>
						{/if}
					{/each}
					<PuzzleTypePanel bind:quizPuzzleMode={quiz.puzzleMode} />
				</div>
			{/if}
		{/if}
		{#if quiz.selectedOperator !== undefined && (quiz.difficulty !== undefined || !quiz.showSettings)}
			<QuizPreviewPanel
				{puzzle}
				title={getQuizTitle(quiz)}
				{validationError}
				on:getPuzzlePreview={() => getPuzzlePreview()}
			/>
			<QuizDurationPanel
				bind:duration={quiz.duration}
				bind:puzzleTimeLimit={quiz.puzzleTimeLimit}
				isDevEnvironment={!AppSettings.isProduction}
			/>
		{/if}

		{#if showSharePanel}
			<SharePanel />
		{/if}
		{#if validationError && showSubmitValidationError}
			<div transition:slide={AppSettings.transitionDuration} class="pb-2">
				<AlertComponent color="red"
					>Du må velge regneart og vanskelighetsgrad.</AlertComponent
				>
			</div>
		{/if}
		<div class="flex justify-between">
			<ButtonComponent on:click={() => getReady()} color="green"
				>Start</ButtonComponent
			>
			{#if quiz.showSettings}
				<ButtonComponent
					on:click={() => toggleSharePanel()}
					color={showSharePanel ? 'gray' : 'blue'}
				>
					Del
				</ButtonComponent>
			{:else}
				<ButtonComponent
					color="gray"
					on:click={() => (quiz.showSettings = true)}
				>
					Meny
				</ButtonComponent>
			{/if}
		</div>
	</form>
{/if}
