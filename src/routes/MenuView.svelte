<script lang="ts">
	import { onMount, tick, untrack } from 'svelte'
	import type { Quiz } from '#lib/models/Quiz.ts'
	import { getQuizDifficultySettings } from '#lib/helpers/quiz/quizHelper.ts'
	import {
		buildQuizMenuSettingsKey,
		buildQuizMenuUrlSyncKey,
		getQuizMenuValidation,
		isAllOperatorsSelected,
		resolveNextQuizPreviewState
	} from '#lib/helpers/quiz/quizMenuHelper.ts'
	import {
		buildQuizParams,
		syncQuizUrlParams
	} from '#lib/helpers/urlParamsHelper.ts'
	import type { Puzzle } from '#lib/models/Puzzle.ts'
	import OperatorSelectionPanel from '#lib/components/panels/OperatorSelectionPanel.svelte'
	import OnboardingPanel from '#lib/components/panels/OnboardingPanel.svelte'
	import QuizDurationPanel from '#lib/components/panels/QuizDurationPanel.svelte'
	import QuizPreviewPanel from '#lib/components/panels/QuizPreviewPanel.svelte'
	import DifficultyPanel from '#lib/components/panels/DifficultyPanel.svelte'
	import CustomDifficultySettingsPanel from '#lib/components/panels/CustomDifficultySettingsPanel.svelte'
	import {
		customDifficultyId,
		type DifficultyMode
	} from '#lib/models/AdaptiveProfile.ts'
	import type { PreviewSimulationOutcome } from '#lib/models/PreviewSimulation.ts'
	import { createRng, type Rng } from '#lib/helpers/rng.ts'
	import { getStickyGlobalNavContext } from '#lib/contexts/stickyGlobalNavContext.ts'
	import { toast_validation_error } from '#lib/paraglide/messages.js'
	import { onboardingCompleted, showDevTools, showToast } from '#lib/stores.ts'

	let {
		quiz = $bindable(),
		onGetReady = () => {}
	}: {
		quiz: Quiz
		onGetReady?: (quiz: Quiz) => void
	} = $props()

	let isMounted = $state(false)
	let puzzle = $state<Puzzle | undefined>(undefined)
	let showSubmitValidationError = $state(false)
	let lastPreviewGeneratedAt: number | undefined
	let lastPreviewSettingsKey: string | undefined
	const previewRng: Rng = createRng().rng
	const stickyGlobalNavContext = getStickyGlobalNavContext()

	let hasSelectedOperator = $derived(quiz.selectedOperator !== undefined)

	let hasDifficulty = $derived(quiz.difficulty !== undefined)

	let canShowCustomDifficultySettings = $derived(
		hasSelectedOperator && quiz.difficulty === customDifficultyId
	)

	let canShowPreviewAndDuration = $derived(hasSelectedOperator && hasDifficulty)

	let isAllOperators = $derived(isAllOperatorsSelected(quiz))

	let validation = $derived.by(() =>
		getQuizMenuValidation(quiz, isAllOperators)
	)

	// Derived keys that consolidate reactive dependencies for the effects below.
	// quizSettingsKey covers puzzle-affecting settings; urlSyncKey extends it
	// with display-only settings that only matter for URL serialization.
	let quizSettingsKey = $derived(buildQuizMenuSettingsKey(quiz))

	let urlSyncKey = $derived(buildQuizMenuUrlSyncKey(quizSettingsKey, quiz))

	// URL sync: runs on any quiz setting change
	$effect(() => {
		if (!validation.hasError && isMounted) {
			void urlSyncKey
			untrack(() => syncQuizUrlParams(quiz))
		}
	})

	// Preview: runs only on puzzle-affecting setting changes
	$effect(() => {
		if (!validation.hasError && isMounted) {
			const nextPreviewSettingsKey = quizSettingsKey
			if (nextPreviewSettingsKey === lastPreviewSettingsKey) return

			lastPreviewSettingsKey = nextPreviewSettingsKey
			untrack(() => refreshPreview())
		}
	})

	const refreshPreview = (
		simulatedOutcome: PreviewSimulationOutcome | undefined = undefined
	) => {
		const nextPreview = resolveNextQuizPreviewState({
			quiz,
			previewRng,
			currentPuzzle: puzzle,
			lastPreviewGeneratedAt,
			simulatedOutcome
		})

		puzzle = nextPreview.puzzle
		lastPreviewGeneratedAt = nextPreview.generatedAt
	}

	const getReady = () => {
		if (validation.hasError) {
			showSubmitValidationError = true
			showToast(toast_validation_error(), { variant: 'error' })
			return
		}

		onGetReady(quiz)
	}

	const setDifficultyMode = (mode: DifficultyMode) => {
		quiz = getQuizDifficultySettings(quiz, mode)
	}

	const updateQuiz = (changes: Partial<Quiz>) => {
		quiz = {
			...quiz,
			...changes
		}
	}

	const setSelectedOperator = (selectedOperator: Quiz['selectedOperator']) => {
		updateQuiz({ selectedOperator })
	}

	const setDurationSettings = (settings: {
		duration: number
		showPuzzleProgressBar: boolean
	}) => {
		updateQuiz(settings)
	}

	const setCustomDifficultyQuiz = (nextQuiz: Quiz) => {
		quiz = nextQuiz
	}

	async function dismissOnboarding() {
		onboardingCompleted.current = true
		await tick()
		const firstOperatorInput = document.querySelector<HTMLInputElement>(
			'[data-testid="operator-0"]'
		)
		firstOperatorInput?.focus()
	}

	onMount(() => {
		isMounted = true

		if (!validation.hasError) syncQuizUrlParams(quiz)
	})

	$effect(() => {
		const unregister = stickyGlobalNavContext.registerStartActions({
			onStart: getReady,
			canCopyLink: () => !validation.hasError,
			getCopyLinkSearchParams: () => buildQuizParams(quiz)
		})

		return unregister
	})
</script>

<form onsubmit={(event) => event.preventDefault()}>
	{#if !onboardingCompleted.current}
		<OnboardingPanel onDismiss={dismissOnboarding} />
	{/if}
	<!-- Operator validation is gated on submit unlike the table panels: no operator
	     is chosen yet on first load, so an immediate error would nag before any
	     interaction, while an emptied table list is always the user's own doing. -->
	<OperatorSelectionPanel
		selectedOperator={quiz.selectedOperator}
		onSelectedOperatorChange={setSelectedOperator}
		showValidationError={quiz.selectedOperator === undefined &&
			showSubmitValidationError}
	/>
	{#if hasSelectedOperator}
		<DifficultyPanel
			difficultyMode={quiz.difficulty}
			onSetDifficultyMode={setDifficultyMode}
		/>
	{/if}
	{#if canShowCustomDifficultySettings}
		<CustomDifficultySettingsPanel
			{quiz}
			{isAllOperators}
			hasInvalidAdditionRange={validation.hasInvalidAdditionRange}
			hasInvalidSubtractionRange={validation.hasInvalidSubtractionRange}
			hasMissingMultiplicationValues={validation.hasMissingMultiplicationValues}
			hasMissingDivisionValues={validation.hasMissingDivisionValues}
			onQuizChange={setCustomDifficultyQuiz}
		/>
	{/if}
	{#if canShowPreviewAndDuration}
		<QuizPreviewPanel
			{puzzle}
			validationError={validation.hasError}
			isDevEnvironment={showDevTools.current}
			adaptiveSkillByOperator={quiz.adaptiveSkillByOperator}
			onRefreshPreview={() => refreshPreview()}
			onSimulatePuzzlePreview={(outcome: PreviewSimulationOutcome) =>
				refreshPreview(outcome)}
		/>
		<QuizDurationPanel
			duration={quiz.duration}
			showPuzzleProgressBar={quiz.showPuzzleProgressBar}
			onDurationSettingsChange={setDurationSettings}
			isDevEnvironment={showDevTools.current}
		/>
	{/if}
</form>
