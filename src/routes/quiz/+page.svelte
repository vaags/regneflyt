<script lang="ts">
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import QuizComponent from '$lib/components/screens/QuizComponent.svelte'
	import { getQuizLeaveNavigationContext } from '$lib/contexts/quizLeaveNavigationContext'
	import { initQuizFromQuery, initQuizFromUrl } from '$lib/helpers/quizHelper'
	import { getQuizStats } from '$lib/helpers/statsHelper'
	import { QuizState } from '$lib/constants/QuizState'
	import type { Quiz } from '$lib/models/Quiz'
	import type { Puzzle } from '$lib/models/Puzzle'
	import type { AdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
	import {
		adaptiveSkills,
		type LastResults,
		lastResults,
		updatePracticeStreak
	} from '$lib/stores'
	import {
		buildQuizParams,
		buildReplayParams
	} from '$lib/helpers/urlParamsHelper'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	let quiz = $state<Quiz | undefined>(undefined)
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
		if (!quiz) return
		const params = buildQuizParams(quiz)
		requestQuizLeaveNavigation(`/?${params}`)
	}

	function completeQuiz(puzzleSet: Puzzle[], timedOut: boolean) {
		if (!quiz) return
		const currentQuiz = quiz

		const quizStats = getQuizStats(puzzleSet)

		$adaptiveSkills = [...currentQuiz.adaptiveSkillByOperator]
		$lastResults = {
			puzzleSet,
			quizStats,
			quiz: { ...currentQuiz },
			preQuizSkill: preQuizSkill ?? [...currentQuiz.adaptiveSkillByOperator],
			timedOut
		}
		updatePracticeStreak()

		// Pass quiz params on the results URL so "Back to Menu" can restore them
		const resultParams = buildQuizParams(currentQuiz)
		navigateWithQuizLeaveBypass(`/results?${resultParams}`)
	}

	function getInitialQuizForPage(
		isReplay: boolean,
		query: PageData['query'],
		currentResults: LastResults | null | undefined,
		currentAdaptiveSkills: AdaptiveSkillMap
	): Quiz | undefined {
		if (!isReplay) return initQuizFromQuery(query, currentAdaptiveSkills)
		if (!currentResults?.puzzleSet?.length) return undefined

		return {
			...initQuizFromUrl(
				buildReplayParams(currentResults.quiz),
				currentAdaptiveSkills
			),
			replayPuzzles: currentResults.puzzleSet
		}
	}

	$effect(() => {
		const isReplay = data.isReplay
		const latestResults = untrack(() => $lastResults)
		const latestAdaptiveSkills = untrack(() => $adaptiveSkills)
		const initialQuiz = getInitialQuizForPage(
			isReplay,
			data.query,
			latestResults,
			latestAdaptiveSkills
		)

		if (isReplay && !initialQuiz) {
			navigateWithQuizLeaveBypass('/')
			quiz = undefined
			return
		}
		if (!initialQuiz) return

		const q = {
			...initialQuiz,
			state: QuizState.AboutToStart
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
