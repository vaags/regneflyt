<script lang="ts">
	import { onMount, setContext } from 'svelte'
	import { goto } from '$app/navigation'
	import QuizComponent from '$lib/components/screens/QuizComponent.svelte'
	import { getQuiz } from '$lib/helpers/quizHelper'
	import { getQuizStats } from '$lib/helpers/statsHelper'
	import { QuizState } from '$lib/constants/QuizState'
	import type { Quiz } from '$lib/models/Quiz'
	import type { Puzzle } from '$lib/models/Puzzle'
	import type { AdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
	import {
		adaptiveSkills,
		lastResults,
		updatePracticeStreak
	} from '$lib/stores'
	import { buildQuizParams } from '$lib/helpers/urlParamsHelper'

	let quiz = $state<Quiz>(undefined!)
	let preQuizSkill = $state<AdaptiveSkillMap | undefined>(undefined)

	const startQuiz = () => {
		if (quiz) quiz.state = QuizState.Started
	}

	const abortQuiz = () => {
		const params = buildQuizParams(quiz)
		goto(`/?${params}`)
	}

	setContext('startQuiz', startQuiz)
	setContext('abortQuiz', abortQuiz)

	function completeQuiz(puzzleSet: Puzzle[], timedOut: boolean) {
		const quizStats = getQuizStats(puzzleSet)

		$adaptiveSkills = [...quiz.adaptiveSkillByOperator]
		$lastResults = {
			puzzleSet,
			quizStats,
			quiz: { ...quiz },
			preQuizSkill: preQuizSkill ?? [...quiz.adaptiveSkillByOperator],
			timedOut
		}
		updatePracticeStreak()

		// Pass quiz params on the results URL so "Back to Menu" can restore them
		const resultParams = buildQuizParams(quiz)
		goto(`/results?${resultParams}`)
	}

	onMount(() => {
		const params = new URLSearchParams(window.location.search)
		const isReplay = params.get('replay') === 'true'

		const q = getQuiz(params)
		q.adaptiveSkillByOperator = [...$adaptiveSkills]
		q.state = QuizState.AboutToStart

		if (isReplay && $lastResults?.puzzleSet) {
			q.replayPuzzles = $lastResults.puzzleSet
		}

		preQuizSkill = [...q.adaptiveSkillByOperator]
		quiz = q
	})
</script>

{#if quiz}
	<QuizComponent {quiz} onCompleteQuiz={completeQuiz} />
{/if}
