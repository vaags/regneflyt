<script lang="ts">
	import { onMount } from 'svelte'
	import MenuComponent from '../components/screens/MenuComponent.svelte'
	import ResultsComponent from '../components/screens/ResultsComponent.svelte'
	import QuizComponent from '../components/screens/QuizComponent.svelte'
	import type { Puzzle } from '../models/Puzzle'
	import { getQuizScoreSum } from '../helpers/scoreHelper'
	import type { QuizScores } from '../models/QuizScores'
	import { getQuiz } from '../helpers/quizHelper'
	import { QuizState } from '../models/constants/QuizState'
	import type { Quiz } from '../models/Quiz'
	import WelcomePanel from '../components/panels/WelcomePanel.svelte'
	import { adaptiveProfiles, overallSkill, lastResults } from '../stores'
	import {
		type AdaptiveSkillMap,
		defaultAdaptiveSkillMap
	} from '../models/AdaptiveProfile'
	import { getAdaptiveMode } from '../helpers/adaptiveHelper'
	import SkillDialogComponent from '../components/dialogs/SkillDialogComponent.svelte'

	let skillDialog: SkillDialogComponent

	let quizScores: QuizScores
	let puzzleSet: Puzzle[]
	let quiz: Quiz
	let preQuizSkill: AdaptiveSkillMap = [...defaultAdaptiveSkillMap]
	let animateSkill = false
	let showContent: boolean
	let showWelcomePanel = true

	function getReady(updatedQuiz: Quiz) {
		quiz = updatedQuiz
		quiz.state = QuizState.AboutToStart
		preQuizSkill = [...quiz.adaptiveSkillByOperator]
		showWelcomePanel = false
		scrollToTop()
	}

	const startQuiz = () => (quiz.state = QuizState.Started)
	const hideWelcomePanel = () => (showWelcomePanel = false)
	const abortQuiz = () => (quiz.state = QuizState.Initial)

	function completeQuiz(completedPuzzleSet: Puzzle[]) {
		quiz.state = QuizState.Completed
		puzzleSet = completedPuzzleSet
		quizScores = getQuizScoreSum(quiz, puzzleSet)

		const mode = getAdaptiveMode(quiz.difficulty)
		adaptiveProfiles.update((profiles) => ({
			...profiles,
			[mode]: [...quiz.adaptiveSkillByOperator]
		}))

		$lastResults = { puzzleSet, quizScores, quiz: { ...quiz }, preQuizSkill }
		animateSkill = true
	}

	function resetQuiz(previousScore: number) {
		quiz.state = QuizState.Initial
		quiz.previousScore = previousScore
		scrollToTop()
	}

	function showResults() {
		if (!puzzleSet?.length && $lastResults) {
			puzzleSet = $lastResults.puzzleSet
			quizScores = $lastResults.quizScores
			quiz = { ...$lastResults.quiz }
			preQuizSkill = $lastResults.preQuizSkill ?? [
				...quiz.adaptiveSkillByOperator
			]
		}
		animateSkill = false
		quiz.state = QuizState.Completed
		scrollToTop()
	}

	function scrollToTop() {
		window.scrollTo({
			top: 0,
			left: 0,
			behavior: 'smooth'
		})
	}

	onMount(() => {
		quiz = getQuiz(new URLSearchParams(window.location.search))
		const mode = getAdaptiveMode(quiz.difficulty)
		quiz.adaptiveSkillByOperator = [...$adaptiveProfiles[mode]]
		showContent = true
	})
</script>

<div
	class="container mx-auto max-w-lg min-w-min px-2 py-2 md:max-w-xl md:px-4 md:py-3"
>
	<header
		class="font-handwriting -mb-1 flex flex-row-reverse items-center justify-between text-3xl md:text-4xl"
	>
		<h1
			class="cursor-pointer text-4xl text-orange-700 drop-shadow-sm md:text-5xl dark:text-orange-500 dark:drop-shadow-md"
		>
			<button on:click={() => (showWelcomePanel = !showWelcomePanel)}>
				Regneflyt</button
			>
		</h1>
		{#if $overallSkill}
			<button
				class="text-yellow-500 transition-colors hover:text-yellow-400"
				title="Ferdighetsnivå"
				on:click={() => skillDialog.open()}
			>
				{$overallSkill}%
			</button>
		{/if}
	</header>
	<main class="mb-3">
		{#if showWelcomePanel}
			<WelcomePanel />
		{/if}
		{#if showContent}
			{#if quiz.state === QuizState.AboutToStart || quiz.state === QuizState.Started}
				<QuizComponent
					{quiz}
					onStartQuiz={startQuiz}
					onAbortQuiz={abortQuiz}
					onCompleteQuiz={completeQuiz}
				/>
			{:else if quiz.state === QuizState.Completed}
				<ResultsComponent
					{quiz}
					{quizScores}
					{puzzleSet}
					{preQuizSkill}
					{animateSkill}
					onGetReady={getReady}
					onResetQuiz={resetQuiz}
				/>
			{:else}
				<MenuComponent
					{quiz}
					onGetReady={getReady}
					onHideWelcomePanel={hideWelcomePanel}
					onShowResults={puzzleSet?.length || $lastResults
						? showResults
						: undefined}
				/>
			{/if}
		{/if}
	</main>
</div>

<SkillDialogComponent bind:this={skillDialog} />
