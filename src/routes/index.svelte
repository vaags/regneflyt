<script lang="ts">
	import { onMount } from 'svelte'
	import MenuComponent from '../components/MenuComponent.svelte'
	import ResultsComponent from '../components/ResultsComponent.svelte'
	import QuizComponent from '../components/QuizComponent.svelte'
	import GameOverComponent from '../components/GameOverComponent.svelte'
	import type { Puzzle } from '../models/Puzzle'
	import { getQuizScoreSum } from '../services/scoreService'
	import type { QuizScores } from '../models/QuizScores'
	import { getQuiz } from '../services/quizService'
	import { QuizState } from '../models/constants/QuizState'
	import type { Quiz } from '../models/Quiz'
	import WelcomePanel from '../components/panels/WelcomePanel.svelte'
	import { highscore } from '../stores'
	import '../app.css'
	import TweenedValueComponent from '../components/widgets/TweenedValueComponent.svelte'

	let quizScores: QuizScores
	let puzzleSet: Puzzle[]
	let quiz: Quiz
	let fakeInput: HTMLInputElement
	let showContent: boolean
	let showWelcomePanel = true

	function getReady(event: any) {
		quiz = event.detail?.quiz ?? quiz
		quiz.state = QuizState.AboutToStart
		showWelcomePanel = false
		scrollToTop()
		fakeInputFocus(fakeInput)
	}

	const startQuiz = () => (quiz.state = QuizState.Started)
	const hideWelcomePanel = () => (showWelcomePanel = false)
	const abortQuiz = () => (quiz.state = QuizState.Initial)

	function completeQuiz(event: any) {
		quiz.state = QuizState.Completed
		puzzleSet = event.detail.puzzleSet
		quizScores = getQuizScoreSum(quiz, puzzleSet)
	}

	const evaluateQuiz = () => (quiz.state = QuizState.Evaluated)

	function resetQuiz(event: any) {
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

	export function fakeInputFocus(fakeInput: HTMLInputElement) {
		// Hack to get Safari / Ios to focus
		// create invisible dummy input to receive the focus first
		// Ref: https://stackoverflow.com/a/45703019
		if (!fakeInput) {
			fakeInput = document.createElement('input')
			fakeInput.setAttribute('type', 'number')
			fakeInput.style.position = 'absolute'
			fakeInput.style.opacity = '0'
			fakeInput.style.height = '0'
			fakeInput.style.fontSize = '16px' // disable auto zoom

			// you may need to append to another element depending on the browser's auto
			// zoom/scroll behavior
			document.body.prepend(fakeInput)
		}

		fakeInput.focus()
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
		<h1
			class="cursor-pointer text-orange-600"
			on:click={() => (showWelcomePanel = !showWelcomePanel)}
		>
			Regneflyt
		</h1>
		{#if $highscore}
			<div class="text-yellow-500" title="Personlig rekord">
				<TweenedValueComponent value={$highscore} />
			</div>
		{/if}
	</header>
	<main>
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
				<MenuComponent {quiz} on:getReady={getReady} on:hideWelcomePanel={hideWelcomePanel} />
			{/if}
		{/if}
	</main>
</div>
