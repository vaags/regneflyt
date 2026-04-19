<script lang="ts">
	import { onMount, tick, untrack } from 'svelte'
	import { Operator } from '$lib/constants/Operator'
	import type { Quiz } from '$lib/models/Quiz'
	import {
		buildQuizMenuSettingsKey,
		buildQuizMenuUrlSyncKey,
		getQuizMenuValidation,
		isAllOperatorsSelected,
		resolveNextQuizPreviewState
	} from '$lib/helpers/quiz/quizMenuHelper'
	import { getQuizDifficultySettings } from '$lib/helpers/quiz/quizHelper'
	import {
		buildQuizParams,
		syncQuizUrlParams
	} from '$lib/helpers/urlParamsHelper'
	import type { Puzzle } from '$lib/models/Puzzle'
	import OperatorSelectionPanel from '$lib/components/panels/OperatorSelectionPanel.svelte'
	import OnboardingPanel from '$lib/components/panels/OnboardingPanel.svelte'
	import QuizDurationPanel from '$lib/components/panels/QuizDurationPanel.svelte'
	import QuizPreviewPanel from '$lib/components/panels/QuizPreviewPanel.svelte'
	import DifficultyPanel from '$lib/components/panels/DifficultyPanel.svelte'
	import CustomDifficultySettingsPanel from '$lib/components/panels/CustomDifficultySettingsPanel.svelte'
	import { customAdaptiveDifficultyId } from '$lib/models/AdaptiveProfile'
	import type { DifficultyMode } from '$lib/models/AdaptiveProfile'
	import type { PreviewSimulationOutcome } from '$lib/constants/PreviewSimulation'
	import { createRng, type Rng } from '$lib/helpers/rng'
	import { getStickyGlobalNavContext } from '$lib/contexts/stickyGlobalNavContext'
	import { toast_validation_error } from '$lib/paraglide/messages.js'
	import { onboardingCompleted, showDevTools, showToast } from '$lib/stores'

	let {
		quiz = $bindable(),
		onGetReady = () => {},
		onReplay = undefined
	}: {
		quiz: Quiz
		onGetReady?: (quiz: Quiz) => void
		onReplay?: (() => void) | undefined
	} = $props()

	let isMounted = $state(false)
	let puzzle = $state<Puzzle | undefined>(undefined)
	let showSubmitValidationError = $state(false)
	let lastPreviewGeneratedAt: number | undefined
	let lastPreviewSettingsKey: string | undefined
	const previewRng: Rng = createRng().rng
	const stickyGlobalNavContext = getStickyGlobalNavContext()

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

	const setSelectedOperator = (selectedOperator: Quiz['selectedOperator']) => {
		quiz = {
			...quiz,
			selectedOperator
		}
	}

	const setDurationSettings = (settings: {
		duration: number
		showPuzzleProgressBar: boolean
	}) => {
		quiz = {
			...quiz,
			duration: settings.duration,
			showPuzzleProgressBar: settings.showPuzzleProgressBar
		}
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
			onReplay,
			canCopyLink: () => !validation.hasError,
			getCopyLinkSearchParams: () => buildQuizParams(quiz)
		})

		return unregister
	})
</script>

<form>
	{#if !onboardingCompleted.current}
		<OnboardingPanel onDismiss={dismissOnboarding} />
	{/if}
	<OperatorSelectionPanel
		selectedOperator={quiz.selectedOperator}
		onSelectedOperatorChange={setSelectedOperator}
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
			{quiz}
			{isAllOperators}
			hasInvalidAdditionRange={validation.hasInvalidAdditionRange}
			hasInvalidSubtractionRange={validation.hasInvalidSubtractionRange}
			onQuizChange={setCustomDifficultyQuiz}
		/>
	{/if}
	{#if quiz.selectedOperator !== undefined && quiz.difficulty !== undefined}
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
