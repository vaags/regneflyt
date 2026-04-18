<script lang="ts">
	import { goto } from '$app/navigation'
	import ResultsView from './ResultsView.svelte'
	import { lastResults } from '$lib/stores'
	import {
		buildQuizPath,
		buildReplayQuizPath
	} from '$lib/helpers/quiz/quizPathHelper'
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
	let hasReplayableResults = $derived(!!lastResults.current?.puzzleSet?.length)

	function handleGetReady(q: Quiz) {
		goto(buildQuizPath(q))
	}

	function handleReplay() {
		const replayPath = buildReplayQuizPath(lastResults.current)
		if (replayPath === undefined) return
		goto(replayPath)
	}
</script>

<ResultsView
	quiz={results?.quiz ?? fallbackQuiz}
	quizStats={results?.quizStats ?? fallbackQuizStats}
	puzzleSet={results?.puzzleSet ?? []}
	preQuizSkill={results?.preQuizSkill ?? [...defaultAdaptiveSkillMap]}
	animateSkill={data.animateSkill && !!results}
	onGetReady={handleGetReady}
	onReplay={hasReplayableResults ? handleReplay : undefined}
/>
