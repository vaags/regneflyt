<script lang="ts">
	import { onMount, untrack } from 'svelte'
	import { slide, fade } from 'svelte/transition'
	import * as m from '$lib/paraglide/messages.js'
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
	import ShareDialogComponent from '../dialogs/ShareDialogComponent.svelte'
	import DifficultyPanel from '../panels/DifficultyPanel.svelte'
	import MultiplicationDivisionPanel from '../panels/MultiplicationDivisionPanel.svelte'
	import AdditionSubtractionPanel from '../panels/AdditionSubtractionPanel.svelte'
	import AlertComponent from '../widgets/AlertComponent.svelte'
	import { customAdaptiveDifficultyId } from '../../models/AdaptiveProfile'
	import { applySkillUpdate } from '../../helpers/adaptiveHelper'
	import type { DifficultyMode } from '../../models/AdaptiveProfile'
	import type { PreviewSimulationOutcome } from '../../models/constants/PreviewSimulation'

	let {
		quiz = $bindable(),
		onGetReady = () => {},
		onHideWelcomePanel = () => {},
		onShowResults = undefined
	}: {
		quiz: Quiz
		onGetReady?: (quiz: Quiz) => void
		onHideWelcomePanel?: () => void
		onShowResults?: (() => void) | undefined
	} = $props()

	let showComponent = $state(false)
	let isMounted = $state(false)
	let puzzle = $state<Puzzle>(undefined!)
	let shareDialog = $state<ShareDialogComponent>(undefined!)
	let showSubmitValidationError = $state(false)
	let lastPreviewGeneratedAt: number | undefined
	const operatorOptions = [
		Operator.Addition,
		Operator.Subtraction,
		Operator.Multiplication,
		Operator.Division
	] as const

	let additionSettings = $derived(quiz.operatorSettings[Operator.Addition])
	let subtractionSettings = $derived(
		quiz.operatorSettings[Operator.Subtraction]
	)
	let multiplicationSettings = $derived(
		quiz.operatorSettings[Operator.Multiplication]
	)
	let divisionSettings = $derived(quiz.operatorSettings[Operator.Division])

	const rangeIsValid = (range: [min: number, max: number]) =>
		range[0] < range[1]

	let isAllOperators = $derived(quiz.selectedOperator === OperatorExtended.All)
	let hasInvalidAdditionRange = $derived(!rangeIsValid(additionSettings.range))
	let hasInvalidSubtractionRange = $derived(
		!rangeIsValid(subtractionSettings.range)
	)
	let hasInvalidRange = $derived(
		hasInvalidAdditionRange || hasInvalidSubtractionRange
	)

	let missingPossibleValues = $derived(
		(quiz.selectedOperator === Operator.Multiplication ||
			quiz.selectedOperator === Operator.Division ||
			isAllOperators) &&
			(multiplicationSettings.possibleValues.length === 0 ||
				divisionSettings.possibleValues.length === 0)
	)

	let validationError = $derived(
		missingPossibleValues ||
			hasInvalidRange ||
			quiz.selectedOperator === undefined
	)

	// URL sync: runs on any quiz setting change
	$effect(() => {
		if (!validationError && quiz && isMounted) {
			void quiz.selectedOperator
			void quiz.puzzleMode
			void quiz.allowNegativeAnswers
			void JSON.stringify(quiz.operatorSettings)
			void quiz.difficulty
			void quiz.duration
			void quiz.hidePuzzleProgressBar

			untrack(() => updateQuizSettings())
		}
	})

	// Preview: runs only on puzzle-affecting setting changes
	$effect(() => {
		if (!validationError && quiz && isMounted) {
			void quiz.selectedOperator
			void quiz.puzzleMode
			void quiz.allowNegativeAnswers
			void JSON.stringify(quiz.operatorSettings)
			void quiz.difficulty

			untrack(() => getPuzzlePreview())
		}
	})

	const getPuzzlePreview = (
		simulatedOutcome: PreviewSimulationOutcome | undefined = undefined
	) => {
		if (simulatedOutcome && puzzle) {
			const now = Date.now()
			const intervalSeconds = lastPreviewGeneratedAt
				? (now - lastPreviewGeneratedAt) / 1000
				: AppSettings.regneflytThresholdSeconds

			applySkillUpdate(
				quiz.adaptiveSkillByOperator,
				puzzle.operator,
				puzzle.parts,
				simulatedOutcome === 'correct',
				intervalSeconds
			)
		}

		puzzle = getPuzzle(quiz, puzzle ? [puzzle] : [])
		lastPreviewGeneratedAt = Date.now()
	}

	function updateQuizSettings() {
		if (quiz.showSettings) setUrlParams(quiz)
	}

	const openShareDialog = () =>
		validationError ? (showSubmitValidationError = true) : shareDialog.open()

	const getReady = () => {
		return validationError
			? (showSubmitValidationError = true)
			: onGetReady(quiz)
	}

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
				title={quiz.title}
				isDevEnvironment={!AppSettings.isProduction}
				adaptiveSkillByOperator={quiz.adaptiveSkillByOperator}
				onRefreshPreview={() => getPuzzlePreview()}
				onSimulatePuzzlePreview={(outcome: PreviewSimulationOutcome) =>
					getPuzzlePreview(outcome)}
			/>
			<QuizDurationPanel
				bind:duration={quiz.duration}
				bind:hidePuzzleProgressBar={quiz.hidePuzzleProgressBar}
				isDevEnvironment={!AppSettings.isProduction}
			/>
		{/if}

		<ShareDialogComponent bind:this={shareDialog} />
		{#if validationError && showSubmitValidationError}
			<div
				transition:slide={AppSettings.transitionDuration}
				class="pb-2"
				aria-live="assertive"
			>
				<AlertComponent color="red">{m.alert_must_select()}</AlertComponent>
			</div>
		{/if}
		<nav class="flex justify-between" data-testid="menu-actions">
			<ButtonComponent onclick={() => getReady()} color="green"
				>{m.button_start()}</ButtonComponent
			>
			<div class="flex gap-2 md:gap-3">
				{#if onShowResults}
					<ButtonComponent onclick={onShowResults} color="gray"
						>{m.button_results()}</ButtonComponent
					>
				{/if}
				{#if quiz.showSettings}
					<ButtonComponent
						onclick={() => openShareDialog()}
						color="gray"
						size="small"
					>
						{m.button_share()}
					</ButtonComponent>
				{:else}
					<ButtonComponent
						color="gray"
						onclick={() => (quiz.showSettings = true)}
					>
						{m.button_menu()}
					</ButtonComponent>
				{/if}
			</div>
		</nav>
	</form>
{/if}
