<script lang="ts">
	import { onMount } from 'svelte'
	import MenuComponent from '../components/screens/MenuComponent.svelte'
	import ResultsComponent from '../components/screens/ResultsComponent.svelte'
	import QuizComponent from '../components/screens/QuizComponent.svelte'
	import GameOverComponent from '../components/screens/GameOverComponent.svelte'
	import type { Puzzle } from '../models/Puzzle'
	import { getQuizScoreSum } from '../helpers/scoreHelper'
	import type { QuizScores } from '../models/QuizScores'
	import { getQuiz } from '../helpers/quizHelper'
	import { QuizState } from '../models/constants/QuizState'
	import type { Quiz } from '../models/Quiz'
	import WelcomePanel from '../components/panels/WelcomePanel.svelte'
	import { adaptiveProfiles, highscore } from '../stores'
	import TweenedValueComponent from '../components/widgets/TweenedValueComponent.svelte'
	import { getAdaptiveMode } from '../models/AdaptiveProfile'

	let quizScores: QuizScores
	let puzzleSet: Puzzle[]
	let quiz: Quiz
	let showContent: boolean
	let showWelcomePanel = true

	function getReady(updatedQuiz: Quiz) {
		quiz = updatedQuiz
		quiz.state = QuizState.AboutToStart
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
	}

	const evaluateQuiz = () => (quiz.state = QuizState.Evaluated)

	function resetQuiz(previousScore: number) {
		quiz.state = QuizState.Initial
		quiz.previousScore = previousScore
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
		{#if $highscore}
			<div class="text-yellow-500" title="Personlig rekord">
				<TweenedValueComponent value={$highscore} />
			</div>
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
				<GameOverComponent onEvaluateQuiz={evaluateQuiz} />
			{:else if quiz.state === QuizState.Evaluated}
				<ResultsComponent
					{quiz}
					{quizScores}
					{puzzleSet}
					onGetReady={getReady}
					onResetQuiz={resetQuiz}
				/>
			{:else}
				<MenuComponent
					{quiz}
					onGetReady={getReady}
					onHideWelcomePanel={hideWelcomePanel}
				/>
			{/if}
		{/if}
	</main>
</div>
