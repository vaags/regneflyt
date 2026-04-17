<script lang="ts">
	import { goto } from '$app/navigation'
	import ResultsView from './ResultsView.svelte'
	import { lastResults } from '$lib/stores'
	import {
		buildQuizParams,
		buildReplayParams
	} from '$lib/helpers/urlParamsHelper'
	import { getQuiz } from '$lib/helpers/quizHelper'
	import type { Quiz } from '$lib/models/Quiz'
	import type { QuizStats } from '$lib/models/QuizStats'
	import { defaultAdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()
	let fallbackQuiz = $derived.by(() =>
		getQuiz(new URLSearchParams(data.menuUrl.split('?')[1] ?? ''))
	)
	const fallbackQuizStats: QuizStats = {
		correctAnswerCount: 0,
		correctAnswerPercentage: 0,
		starCount: 0
	}

	let results = $derived($lastResults)
	let hasReplayableResults = $derived(!!$lastResults?.puzzleSet?.length)

	function handleGetReady(q: Quiz) {
		const params = buildQuizParams(q)
		goto(`/quiz?${params}`)
	}

	function handleReplay() {
		if (!$lastResults?.puzzleSet?.length) return
		goto(`/quiz?${buildReplayParams($lastResults.quiz)}`)
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
