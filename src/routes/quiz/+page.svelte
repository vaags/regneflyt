<script lang="ts">
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import PuzzleView from './PuzzleView.svelte'
	import { getQuizLeaveNavigationContext } from '$lib/contexts/quizLeaveNavigationContext'
	import { buildMenuPath } from '$lib/helpers/quiz/quizPathHelper'
	import {
		buildCompletedQuizResultsUrl,
		persistCompletedQuiz
	} from '$lib/helpers/quiz/quizResultsHelper'
	import { resolveQuizRouteEntryState } from '$lib/helpers/quiz/quizStateHelper'
	import { QuizState } from '$lib/constants/QuizState'
	import type { Quiz } from '$lib/models/Quiz'
	import type { Puzzle } from '$lib/models/Puzzle'
	import type { AdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
	import { adaptiveSkills, lastResults } from '$lib/stores'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	let quiz = $state<Quiz | undefined>(undefined)
	let puzzleSet: Puzzle[] = $state([])
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
		requestQuizLeaveNavigation(buildMenuPath(quiz))
	}

	function completeQuiz(puzzleSet: Puzzle[]) {
		if (!quiz) return
		const currentQuiz = quiz

		persistCompletedQuiz(currentQuiz, puzzleSet, preQuizSkill)
		navigateWithQuizLeaveBypass(buildCompletedQuizResultsUrl(currentQuiz))
	}

	function addPuzzle(puzzle: Puzzle) {
		puzzleSet = [...puzzleSet, puzzle]
	}

	function handleCompleteQuiz() {
		completeQuiz(puzzleSet)
	}

	function handleQuizTimeout() {
		completeQuiz(puzzleSet)
	}

	$effect(() => {
		const entryState = resolveQuizRouteEntryState({
			isReplay: data.isReplay,
			query: data.query,
			results: untrack(() => lastResults.current),
			adaptiveSkills: untrack(() => adaptiveSkills.current)
		})

		if (entryState.status === 'redirect-home') {
			navigateWithQuizLeaveBypass('/')
			quiz = undefined
			return
		}

		if (entryState.status !== 'ready') return

		const q = entryState.quiz

		puzzleSet = []
		preQuizSkill = entryState.preQuizSkill
		quiz = q
	})
</script>

{#if quiz}
	<PuzzleView
		seconds={quiz.duration * 60}
		{quiz}
		onStartQuiz={startQuiz}
		onAbortQuiz={abortQuiz}
		onCompleteQuiz={handleCompleteQuiz}
		onQuizTimeout={handleQuizTimeout}
		onAddPuzzle={addPuzzle}
	/>
{/if}
