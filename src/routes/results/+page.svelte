<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import ResultsComponent from '$lib/components/screens/ResultsComponent.svelte'
	import { lastResults } from '$lib/stores'
	import {
		buildQuizParams,
		buildReplayParams
	} from '$lib/helpers/urlParamsHelper'
	import { getQuiz } from '$lib/helpers/quizHelper'
	import type { Quiz } from '$lib/models/Quiz'
	import { defaultAdaptiveSkillMap } from '$lib/models/AdaptiveProfile'

	let showContent = $state(false)
	let animateSkill = $state(false)
	let menuUrl = $state('/')

	onMount(() => {
		if (!$lastResults) {
			goto('/')
			return
		}

		const params = new URLSearchParams(window.location.search)
		// Rebuild the menu URL from quiz params passed on the results URL
		const menuQuiz = getQuiz(params)
		menuUrl = `/?${buildQuizParams(menuQuiz)}`
		animateSkill = params.get('animate') !== 'false'
		showContent = true
	})

	function handleGetReady(q: Quiz) {
		const params = buildQuizParams(q)
		goto(`/quiz?${params}`)
	}

	function handleReplay() {
		if (!$lastResults) return
		goto(`/quiz?${buildReplayParams($lastResults.quiz)}`)
	}

	function handleResetQuiz() {
		goto(menuUrl)
	}

	$effect(() => {
		// Redirect if results are cleared (e.g. dev storage clear)
		if (showContent && !$lastResults) goto('/')
	})
</script>

{#if showContent && $lastResults}
	{@const results = $lastResults}
	<ResultsComponent
		quiz={results.quiz}
		quizStats={results.quizStats}
		puzzleSet={results.puzzleSet}
		preQuizSkill={results.preQuizSkill ?? [...defaultAdaptiveSkillMap]}
		{animateSkill}
		timedOut={results.timedOut ?? false}
		onGetReady={handleGetReady}
		onReplay={handleReplay}
		onResetQuiz={handleResetQuiz}
	/>
{/if}
