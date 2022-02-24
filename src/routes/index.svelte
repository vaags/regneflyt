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
	import { fakeInputFocus } from '../services/appService'
	import { QuizState } from '../models/constants/QuizState'
	import type { Quiz } from 'src/models/Quiz'

	let quizScores: QuizScores
	let puzzleSet: Puzzle[]
	let quiz: Quiz
	let fakeInput: any
	let showContent: boolean

	function getReady(event: any) {
		quiz = event.detail?.quiz ?? quiz
		quiz.state = QuizState.AboutToStart
		scrollToTop()
		fakeInputFocus(fakeInput)
	}

	function startQuiz() {
		quiz.state = QuizState.Started
	}

	function abortQuiz() {
		quiz.state = QuizState.Initial
	}

	function completeQuiz(event: any) {
		quiz.state = QuizState.Completed
		puzzleSet = event.detail.puzzleSet
		quizScores = getQuizScoreSum(quiz, puzzleSet)
	}

	function evaluateQuiz() {
		quiz.state = QuizState.Evaluated
	}

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

	onMount(() => {
		quiz = getQuiz(new URLSearchParams(window.location.search))
		showContent = true
	})
</script>

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
		<MenuComponent {quiz} on:getReady={getReady} />
	{/if}
{/if}
