<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import QuizComponent from '$lib/components/screens/QuizComponent.svelte'
	import { getQuizLeaveNavigationContext } from '$lib/contexts/quizLeaveNavigationContext'
	import { initQuizFromUrl } from '$lib/helpers/quizHelper'
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
	const { requestQuizLeaveNavigation, navigateWithQuizLeaveBypass } =
		getQuizLeaveNavigationContext({
			requestQuizLeaveNavigation: goto,
			navigateWithQuizLeaveBypass: goto
		})

	const startQuiz = () => {
		if (quiz) quiz.state = QuizState.Started
	}

	const abortQuiz = () => {
		const params = buildQuizParams(quiz)
		requestQuizLeaveNavigation(`/?${params}`)
	}

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
		navigateWithQuizLeaveBypass(`/results?${resultParams}`)
	}

	onMount(() => {
		const params = new URLSearchParams(window.location.search)
		const isReplay = params.get('replay') === 'true'

		const q = {
			...initQuizFromUrl(params, $adaptiveSkills),
			state: QuizState.AboutToStart,
			...(isReplay && $lastResults?.puzzleSet
				? { replayPuzzles: $lastResults.puzzleSet }
				: {})
		}

		preQuizSkill = [...q.adaptiveSkillByOperator]
		quiz = q
	})
</script>

{#if quiz}
	<QuizComponent
		{quiz}
		onStartQuiz={startQuiz}
		onAbortQuiz={abortQuiz}
		onCompleteQuiz={completeQuiz}
	/>
{/if}
