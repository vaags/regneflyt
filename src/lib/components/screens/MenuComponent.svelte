<script lang="ts">
	import { onDestroy, onMount, untrack } from 'svelte'
	import { slide } from 'svelte/transition'
	import { Operator, OperatorExtended } from '$lib/constants/Operator'
	import type { Quiz } from '$lib/models/Quiz'
	import { getPuzzle } from '$lib/helpers/puzzleHelper'
	import { getQuizDifficultySettings } from '$lib/helpers/quizHelper'
	import {
		buildCopyLinkUrl,
		buildQuizParams,
		setUrlParams
	} from '$lib/helpers/urlParamsHelper'
	import { AppSettings } from '$lib/constants/AppSettings'
	import type { Puzzle } from '$lib/models/Puzzle'
	import OperatorSelectionPanel from '../panels/OperatorSelectionPanel.svelte'
	import QuizDurationPanel from '../panels/QuizDurationPanel.svelte'
	import QuizPreviewPanel from '../panels/QuizPreviewPanel.svelte'
	import DifficultyPanel from '../panels/DifficultyPanel.svelte'
	import CustomDifficultySettingsPanel from '../panels/CustomDifficultySettingsPanel.svelte'
	import MenuActionsBar from '../panels/MenuActionsBar.svelte'
	import { customAdaptiveDifficultyId } from '$lib/models/AdaptiveProfile'
	import { applySkillUpdate } from '$lib/helpers/adaptiveHelper'
	import type { DifficultyMode } from '$lib/models/AdaptiveProfile'
	import type { PreviewSimulationOutcome } from '$lib/constants/PreviewSimulation'
	import { createRng, type Rng } from '$lib/helpers/rng'
	import {
		toast_copy_link_deterministic_success,
		toast_copy_link_error,
		toast_copy_link_success
	} from '$lib/paraglide/messages.js'
	import ToastComponent from '../widgets/ToastComponent.svelte'

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
	let showSubmitValidationError = $state(false)
	let lastPreviewGeneratedAt: number | undefined
	let previewRng: Rng = createRng().rng
	type CopyToast = {
		id: number
		message: string
		variant: 'success' | 'error'
	}
	let copyToast = $state<CopyToast | undefined>(undefined)
	let copyToastTimeout: number | undefined
	let copyToastIdCounter = 0

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
			untrack(() => setUrlParams(quiz))
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

	const buildCopyLinkBaseUrl = () => {
		const baseUrl = new URL(window.location.href)
		baseUrl.search = buildQuizParams(quiz).toString()
		return baseUrl.toString()
	}

	const dismissCopyToast = () => {
		if (copyToastTimeout) {
			window.clearTimeout(copyToastTimeout)
			copyToastTimeout = undefined
		}

		copyToast = undefined
	}

	const showCopyToast = (message: string, variant: 'success' | 'error') => {
		if (copyToastTimeout) {
			window.clearTimeout(copyToastTimeout)
			copyToastTimeout = undefined
		}

		copyToast = {
			id: ++copyToastIdCounter,
			message,
			variant
		}

		if (variant === 'error') return

		const toastDurationMs = 3500
		copyToastTimeout = window.setTimeout(() => {
			copyToast = undefined
			copyToastTimeout = undefined
		}, toastDurationMs)
	}

	const copyLinkToClipboard = async (
		seed: number | undefined,
		successMessage: string
	) => {
		if (validation.hasError) {
			showSubmitValidationError = true
			return
		}

		const url = buildCopyLinkUrl(buildCopyLinkBaseUrl(), seed)

		try {
			if (!navigator.clipboard?.writeText) {
				throw new Error('Clipboard API unavailable')
			}

			await navigator.clipboard.writeText(url)
			showCopyToast(successMessage, 'success')
		} catch (err) {
			console.error('Copy link failed:', err)
			showCopyToast(toast_copy_link_error(), 'error')
		}
	}

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

		if (!validation.hasError) setUrlParams(quiz)
	})

	onDestroy(() => {
		if (copyToastTimeout) window.clearTimeout(copyToastTimeout)
	})
</script>

<form>
	<OperatorSelectionPanel
		bind:selectedOperator={quiz.selectedOperator}
		showValidationError={quiz.selectedOperator === undefined &&
			showSubmitValidationError}
	/>
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
	{#if quiz.selectedOperator !== undefined && quiz.difficulty !== undefined}
		<QuizPreviewPanel
			{puzzle}
			validationError={validation.hasError}
			isDevEnvironment={!AppSettings.isProduction}
			adaptiveSkillByOperator={quiz.adaptiveSkillByOperator}
			onCopyLink={() =>
				copyLinkToClipboard(undefined, toast_copy_link_success())}
			onCopyDeterministicLink={() =>
				copyLinkToClipboard(quiz.seed, toast_copy_link_deterministic_success())}
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

	<MenuActionsBar onStart={() => getReady()} {onReplay} {onShowResults} />

	{#if copyToast}
		{#key copyToast.id}
			<ToastComponent
				message={copyToast.message}
				variant={copyToast.variant}
				onDismiss={dismissCopyToast}
			/>
		{/key}
	{/if}
</form>
