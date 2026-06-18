<script lang="ts">
	import { goto } from '$app/navigation'
	import ResultsView from './ResultsView.svelte'
	import { lastResults } from '$lib/stores'
	import { buildQuizPath } from '$lib/helpers/quiz/quizPathHelper'
	import {
		hasReplayableResults,
		replayLastResults
	} from '$lib/helpers/quiz/quizReplayHelper'
	import { resolveResultsFallbackQuiz } from '$lib/helpers/quiz/quizStateHelper'
	import type { Quiz } from '$lib/models/Quiz'
	import type { QuizStats } from '$lib/models/QuizStats'
	import { defaultAdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()
	let fallbackQuiz = $derived.by(() => resolveResultsFallbackQuiz(data.menuUrl))
	const fallbackQuizStats: QuizStats = {
		correctAnswerCount: 0,
		correctAnswerPercentage: 0,
		starCount: 0
	}

	let results = $derived(lastResults.current)
	let canReplayLastResults = $derived(hasReplayableResults(lastResults.current))

	function handleGetReady(q: Quiz) {
		void goto(buildQuizPath(q))
	}
</script>

<ResultsView
	quiz={results?.quiz ?? fallbackQuiz}
	quizStats={results?.quizStats ?? fallbackQuizStats}
	puzzleSet={results?.puzzleSet ?? []}
	preQuizSkill={results?.preQuizSkill ?? [...defaultAdaptiveSkillMap]}
	animateSkill={data.animateSkill && Boolean(results)}
	onGetReady={handleGetReady}
	onReplay={canReplayLastResults
		? () => replayLastResults(lastResults.current)
		: undefined}
/>
