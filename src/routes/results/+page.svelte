<script lang="ts">
	import { goto } from '$app/navigation'
	import ResultsComponent from '$lib/components/screens/ResultsComponent.svelte'
	import { lastResults } from '$lib/stores'
	import {
		buildQuizParams,
		buildReplayParams
	} from '$lib/helpers/urlParamsHelper'
	import type { Quiz } from '$lib/models/Quiz'
	import { defaultAdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	let hasReplayableResults = $derived(!!$lastResults?.puzzleSet?.length)

	function handleGetReady(q: Quiz) {
		const params = buildQuizParams(q)
		goto(`/quiz?${params}`)
	}

	function handleReplay() {
		if (!$lastResults?.puzzleSet?.length) return
		goto(`/quiz?${buildReplayParams($lastResults.quiz)}`)
	}

	function handleResetQuiz() {
		goto(data.menuUrl)
	}

	$effect(() => {
		if (!$lastResults) goto('/')
	})
</script>

{#if $lastResults}
	{@const results = $lastResults}
	<ResultsComponent
		quiz={results.quiz}
		quizStats={results.quizStats}
		puzzleSet={results.puzzleSet}
		preQuizSkill={results.preQuizSkill ?? [...defaultAdaptiveSkillMap]}
		animateSkill={data.animateSkill}
		timedOut={results.timedOut ?? false}
		onGetReady={handleGetReady}
		onReplay={hasReplayableResults ? handleReplay : undefined}
		onResetQuiz={handleResetQuiz}
	/>
{/if}
