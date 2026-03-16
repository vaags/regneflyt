<script lang="ts">
	import { onMount, untrack } from 'svelte'
	import { slide } from 'svelte/transition'
	import * as m from '$lib/paraglide/messages.js'
	import { Operator, OperatorExtended } from '$lib/constants/Operator'
	import type { Quiz } from '$lib/models/Quiz'
	import { getPuzzle } from '$lib/helpers/puzzleHelper'
	import { getQuizDifficultySettings } from '$lib/helpers/quizHelper'
	import { setUrlParams } from '$lib/helpers/urlParamsHelper'
	import { AppSettings } from '$lib/constants/AppSettings'
	import type { Puzzle } from '$lib/models/Puzzle'
	import OperatorSelectionPanel from '../panels/OperatorSelectionPanel.svelte'
	import QuizDurationPanel from '../panels/QuizDurationPanel.svelte'
	import QuizPreviewPanel from '../panels/QuizPreviewPanel.svelte'
	import ShareDialogComponent from '../dialogs/ShareDialogComponent.svelte'
	import DifficultyPanel from '../panels/DifficultyPanel.svelte'
	import CustomDifficultySettingsPanel from '../panels/CustomDifficultySettingsPanel.svelte'
	import MenuActionsBar from '../panels/MenuActionsBar.svelte'
	import AlertComponent from '../widgets/AlertComponent.svelte'
	import { customAdaptiveDifficultyId } from '$lib/models/AdaptiveProfile'
	import { applySkillUpdate } from '$lib/helpers/adaptiveHelper'
	import type { DifficultyMode } from '$lib/models/AdaptiveProfile'
	import type { PreviewSimulationOutcome } from '$lib/constants/PreviewSimulation'
	import { createRng, type Rng } from '$lib/helpers/rng'

	let {
		quiz = $bindable(),
		onGetReady = () => {},
		onReplay = undefined,
		onShowResults = undefined
	}: {
		quiz: Quiz
		onGetReady?: (quiz: Quiz) => void
		onReplay?: (() => void) | undefined
		onShowResults?: (() => void) | undefined
	} = $props()

	let isMounted = $state(false)
	let puzzle = $state<Puzzle>(undefined!)
	let shareDialog = $state<ShareDialogComponent>(undefined!)
	let showSubmitValidationError = $state(false)
	let lastPreviewGeneratedAt: number | undefined
	let previewRng: Rng = createRng().rng

	let isAllOperators = $derived(quiz.selectedOperator === OperatorExtended.All)

	let validation = $derived.by(() => {
		const rangeIsValid = (range: [min: number, max: number]) =>
			range[0] < range[1]

		const hasInvalidAdditionRange = !rangeIsValid(
			quiz.operatorSettings[Operator.Addition].range
		)
		const hasInvalidSubtractionRange = !rangeIsValid(
			quiz.operatorSettings[Operator.Subtraction].range
		)
		const hasInvalidRange =
			hasInvalidAdditionRange || hasInvalidSubtractionRange

		const missingPossibleValues =
			(quiz.selectedOperator === Operator.Multiplication ||
				quiz.selectedOperator === Operator.Division ||
				isAllOperators) &&
			(quiz.operatorSettings[Operator.Multiplication].possibleValues.length ===
				0 ||
				quiz.operatorSettings[Operator.Division].possibleValues.length === 0)

		const hasError =
			missingPossibleValues ||
			hasInvalidRange ||
			quiz.selectedOperator === undefined

		return {
			hasInvalidAdditionRange,
			hasInvalidSubtractionRange,
			hasError
		}
	})

	// Derived keys that consolidate reactive dependencies for the effects below.
	// quizSettingsKey covers puzzle-affecting settings; urlSyncKey extends it
	// with display-only settings that only matter for URL serialization.
	let quizSettingsKey = $derived(
		JSON.stringify([
			quiz.selectedOperator,
			quiz.puzzleMode,
			quiz.allowNegativeAnswers,
			quiz.operatorSettings,
			quiz.difficulty
		])
	)

	let urlSyncKey = $derived(
		JSON.stringify([quizSettingsKey, quiz.duration, quiz.showPuzzleProgressBar])
	)

	// URL sync: runs on any quiz setting change
	$effect(() => {
		if (!validation.hasError && isMounted) {
			void urlSyncKey
			untrack(() => {
				if (quiz.showSettings) setUrlParams(quiz)
			})
		}
	})

	// Preview: runs only on puzzle-affecting setting changes
	$effect(() => {
		if (!validation.hasError && isMounted) {
			void quizSettingsKey
			untrack(() => refreshPreview())
		}
	})

	const applySimulatedOutcome = (outcome: PreviewSimulationOutcome) => {
		const now = Date.now()
		const intervalSeconds = lastPreviewGeneratedAt
			? (now - lastPreviewGeneratedAt) / 1000
			: AppSettings.regneflytThresholdSeconds

		applySkillUpdate(
			quiz.adaptiveSkillByOperator,
			puzzle.operator,
			puzzle.parts,
			outcome === 'correct',
			intervalSeconds
		)
	}

	const refreshPreview = (
		simulatedOutcome: PreviewSimulationOutcome | undefined = undefined
	) => {
		if (simulatedOutcome && puzzle) {
			applySimulatedOutcome(simulatedOutcome)
		}

		puzzle = getPuzzle(previewRng, quiz, puzzle ? [puzzle] : [])
		lastPreviewGeneratedAt = Date.now()
	}

	const openShareDialog = () =>
		validation.hasError
			? (showSubmitValidationError = true)
			: shareDialog.open()

	const getReady = () => {
		return validation.hasError
			? (showSubmitValidationError = true)
			: onGetReady(quiz)
	}

	const setDifficultyMode = (mode: DifficultyMode) => {
		quiz = getQuizDifficultySettings(quiz, mode)
	}

	onMount(() => {
		isMounted = true

		if (quiz.showSettings && !validation.hasError) setUrlParams(quiz)
	})
</script>

<form>
	{#if quiz.showSettings}
		<OperatorSelectionPanel bind:selectedOperator={quiz.selectedOperator} />
		{#if quiz.selectedOperator !== undefined}
			<DifficultyPanel
				difficultyMode={quiz.difficulty}
				onSetDifficultyMode={setDifficultyMode}
			/>
		{/if}
		{#if quiz.selectedOperator !== undefined && quiz.difficulty === customAdaptiveDifficultyId}
			<CustomDifficultySettingsPanel
				bind:quiz
				{isAllOperators}
				hasInvalidAdditionRange={validation.hasInvalidAdditionRange}
				hasInvalidSubtractionRange={validation.hasInvalidSubtractionRange}
			/>
		{/if}
	{/if}
	{#if quiz.selectedOperator !== undefined && (quiz.difficulty !== undefined || !quiz.showSettings)}
		<QuizPreviewPanel
			{puzzle}
			validationError={validation.hasError}
			title={quiz.title}
			isDevEnvironment={!AppSettings.isProduction}
			adaptiveSkillByOperator={quiz.adaptiveSkillByOperator}
			onRefreshPreview={() => refreshPreview()}
			onSimulatePuzzlePreview={(outcome: PreviewSimulationOutcome) =>
				refreshPreview(outcome)}
		/>
		<QuizDurationPanel
			bind:duration={quiz.duration}
			bind:showPuzzleProgressBar={quiz.showPuzzleProgressBar}
			isDevEnvironment={!AppSettings.isProduction}
		/>
	{/if}

	<ShareDialogComponent
		bind:this={shareDialog}
		seed={quiz.seed}
		isCustomDifficulty={quiz.difficulty === customAdaptiveDifficultyId}
	/>
	{#if validation.hasError && showSubmitValidationError}
		<div
			transition:slide={AppSettings.transitionDuration}
			class="pb-2"
			aria-live="assertive"
		>
			<AlertComponent color="red">{m.alert_must_select()}</AlertComponent>
		</div>
	{/if}
	<MenuActionsBar
		showSettings={quiz.showSettings}
		onStart={() => getReady()}
		{onReplay}
		onShare={() => openShareDialog()}
		{onShowResults}
		onShowSettings={() => (quiz.showSettings = true)}
	/>
</form>
