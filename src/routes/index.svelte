<script lang="ts">
	import MenuComponent from '../components/MenuComponent.svelte';
	import ResultsComponent from '../components/ResultsComponent.svelte';
	import QuizComponent from '../components/QuizComponent.svelte';
	import GameOverComponent from '../components/GameOverComponent.svelte';
	import type { Puzzle } from '../models/Puzzle';
	import { getQuizScoreSum } from '../services/scoreService';
	import type { QuizScores } from '../models/QuizScores';
	import { getQuiz } from '../services/quizService';
	import { fakeInputFocus, getAppSettings } from '../services/appService';
	import { QuizState } from '../models/constants/QuizState';

	export let isProduction: string;

	let quizScores: QuizScores;
	let appSettings = getAppSettings(isProduction);
	let puzzleSet: Puzzle[];
	let quiz = getQuiz();
	let fakeInput: any;

	function getReady(event: any) {
		quiz = event.detail?.quiz ?? quiz;
		quiz.state = QuizState.AboutToStart;
		appSettings.menuFade = true;
		// animateScroll.scrollToTop() TODO: Scroll to top
		fakeInputFocus(fakeInput);
	}

	function startQuiz() {
		quiz.state = QuizState.Started;
	}

	function abortQuiz() {
		quiz.state = QuizState.Initial;
	}

	function completeQuiz(event: any) {
		quiz.state = QuizState.Completed;
		puzzleSet = event.detail.puzzleSet;
		quizScores = getQuizScoreSum(quiz, puzzleSet);
	}

	function evaluateQuiz() {
		quiz.state = QuizState.Evaluated;
	}

	function resetQuiz(event: any) {
		quiz.state = QuizState.Initial;
		quiz.previousScore = event.detail.previousScore;
		// animateScroll.scrollToTop() TODO: Scroll to top
	}
</script>

{#if quiz.state === QuizState.AboutToStart || quiz.state === QuizState.Started}
	<QuizComponent
		{quiz}
		on:startQuiz={startQuiz}
		on:abortQuiz={abortQuiz}
		on:completeQuiz={completeQuiz}
		{appSettings}
	/>
{:else if quiz.state === QuizState.Completed}
	<GameOverComponent on:evaluateQuiz={evaluateQuiz} {appSettings} />
{:else if quiz.state === QuizState.Evaluated}
	<ResultsComponent
		{quiz}
		{quizScores}
		{appSettings}
		{puzzleSet}
		on:getReady={getReady}
		on:resetQuiz={resetQuiz}
	/>
{:else}
	<MenuComponent {quiz} on:getReady={getReady} {appSettings} />
{/if}
