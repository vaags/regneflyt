<script lang="ts">
	import { onMount } from 'svelte'
	import { slide, fade } from 'svelte/transition'
	import ButtonComponent from '../widgets/ButtonComponent.svelte'
	import { Operator, OperatorExtended } from '../../models/constants/Operator'
	import type { Quiz } from '../../models/Quiz'
	import { getPuzzle } from '../../helpers/puzzleHelper'
	import { getQuizDifficultySettings } from '../../helpers/quizHelper'
	import { setUrlParams } from '../../helpers/urlParamsHelper'
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
	import {
		customAdaptiveDifficultyId,
		getUpdatedSkill
	} from '../../models/AdaptiveProfile'
	import type { DifficultyMode } from '../../models/AdaptiveProfile'
	import type { PreviewSimulationOutcome } from '../../models/constants/PreviewSimulation'

	export let quiz: Quiz
	export let onGetReady: (quiz: Quiz) => void = () => {}
	export let onHideWelcomePanel: () => void = () => {}

	let quizHistoricState = { ...quiz }

	let showComponent = false
	let isMounted = false
	let puzzle: Puzzle
	let showSharePanel: boolean
	let showSubmitValidationError: boolean
	let lastPreviewGeneratedAt: number | undefined
	const operatorOptions = [
		Operator.Addition,
		Operator.Subtraction,
		Operator.Multiplication,
		Operator.Division
	] as const

	$: additionSettings = quiz.operatorSettings[Operator.Addition]
	$: subtractionSettings = quiz.operatorSettings[Operator.Subtraction]
	$: multiplicationSettings = quiz.operatorSettings[Operator.Multiplication]
	$: divisionSettings = quiz.operatorSettings[Operator.Division]

	$: if (
		!additionSettings ||
		!subtractionSettings ||
		!multiplicationSettings ||
		!divisionSettings
	) {
		throw new Error('Missing operator settings in menu')
	}

	$: isAllOperators = quiz.selectedOperator === OperatorExtended.All
	$: hasInvalidAdditionRange = !rangeIsValid(additionSettings.range)
	$: hasInvalidSubtractionRange = !rangeIsValid(subtractionSettings.range)
	$: hasInvalidRange = hasInvalidAdditionRange || hasInvalidSubtractionRange

	$: missingPossibleValues =
		(quiz.selectedOperator === Operator.Multiplication ||
			quiz.selectedOperator === Operator.Division ||
			isAllOperators) &&
		(multiplicationSettings.possibleValues.length == 0 ||
			divisionSettings.possibleValues.length == 0)

	$: validationError =
		missingPossibleValues ||
		hasInvalidRange ||
		quiz.selectedOperator === undefined

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
	const getPuzzlePreview = (
		simulatedOutcome: PreviewSimulationOutcome | undefined = undefined
	) => {
		if (simulatedOutcome && puzzle) {
			const now = Date.now()
			const intervalSeconds = lastPreviewGeneratedAt
				? (now - lastPreviewGeneratedAt) / 1000
				: AppSettings.regneflytThresholdSeconds

			const previousSkill = quiz.adaptiveSkillByOperator[puzzle.operator]
			const nextSkill = getUpdatedSkill(
				previousSkill,
				simulatedOutcome === 'correct',
				intervalSeconds,
				false
			)

			quiz.adaptiveSkillByOperator[puzzle.operator] = nextSkill
		}

		puzzle = getPuzzle(quiz, puzzle)
		lastPreviewGeneratedAt = Date.now()
	}

	function updateQuizSettings() {
		if (quiz.showSettings) setUrlParams(quiz)
	}

	const toggleSharePanel = () =>
		validationError
			? (showSubmitValidationError = true)
			: (showSharePanel = !showSharePanel)

	const getReady = () =>
		validationError ? (showSubmitValidationError = true) : onGetReady(quiz)

	const setDifficultyMode = (mode: DifficultyMode) => {
		quiz = getQuizDifficultySettings(quiz, mode)
	}

	const hideWelcomePanel = () => onHideWelcomePanel()

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
				onHideWelcomePanel={hideWelcomePanel}
			/>
			{#if quiz.selectedOperator !== undefined}
				<DifficultyPanel
					difficultyMode={quiz.difficulty}
					onSetDifficultyMode={setDifficultyMode}
				/>
			{/if}
			{#if quiz.selectedOperator !== undefined && quiz.difficulty === customAdaptiveDifficultyId}
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
			{/if}
		{/if}
		{#if quiz.selectedOperator !== undefined && (quiz.difficulty !== undefined || !quiz.showSettings)}
			<QuizPreviewPanel
				{puzzle}
				{validationError}
				onSimulatePuzzlePreview={(outcome: PreviewSimulationOutcome) =>
					getPuzzlePreview(outcome)}
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
