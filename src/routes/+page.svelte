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
	import { highscore } from '../stores'
	import '../app.css'
	import TweenedValueComponent from '../components/widgets/TweenedValueComponent.svelte'
	import { dev } from '$app/environment'
	import { inject } from '@vercel/analytics'

	inject({ mode: dev ? 'development' : 'production' })

	let quizScores: QuizScores
	let puzzleSet: Puzzle[]
	let quiz: Quiz
	let showContent: boolean
	let showWelcomePanel = true

	function getReady(event: CustomEvent) {
		quiz = event.detail?.quiz ?? quiz
		quiz.state = QuizState.AboutToStart
		showWelcomePanel = false
		scrollToTop()
	}

	const startQuiz = () => (quiz.state = QuizState.Started)
	const hideWelcomePanel = () => (showWelcomePanel = false)
	const abortQuiz = () => (quiz.state = QuizState.Initial)

	function completeQuiz(event: CustomEvent) {
		quiz.state = QuizState.Completed
		puzzleSet = event.detail.puzzleSet
		quizScores = getQuizScoreSum(quiz, puzzleSet)
	}

	const evaluateQuiz = () => (quiz.state = QuizState.Evaluated)

	function resetQuiz(event: CustomEvent) {
		quiz.state = QuizState.Initial
		quiz.previousScore = event.detail.previousScore
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
		showContent = true
	})
</script>

<div class="container mx-auto min-w-min max-w-lg px-1 py-1 md:px-3 md:py-2">
	<header
		class="font-handwriting -mb-1 flex flex-row-reverse items-center justify-between text-2xl md:text-3xl"
	>
		<h1 class="cursor-pointer text-orange-600">
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
	<main class="mb-2">
		{#if showWelcomePanel}
			<WelcomePanel />
		{/if}
		{#if showContent}
			{#if quiz.state === QuizState.AboutToStart || quiz.state === QuizState.Started}
				<QuizComponent
					{quiz}
					on:startQuiz={startQuiz}
					on:abortQuiz={abortQuiz}
					on:completeQuiz={completeQuiz}
				/>
			{:else if quiz.state === QuizState.Completed}
				<GameOverComponent on:evaluateQuiz={evaluateQuiz} />
			{:else if quiz.state === QuizState.Evaluated}
				<ResultsComponent
					{quiz}
					{quizScores}
					{puzzleSet}
					on:getReady={getReady}
					on:resetQuiz={resetQuiz}
				/>
			{:else}
				<MenuComponent
					{quiz}
					on:getReady={getReady}
					on:hideWelcomePanel={hideWelcomePanel}
				/>
			{/if}
		{/if}
	</main>
</div>
