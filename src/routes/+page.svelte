<script lang="ts">
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import MenuView from './MenuView.svelte'
	import { adaptiveSkills, lastResults } from '$lib/stores'
	import { initQuizFromQuery } from '$lib/helpers/quizHelper'
	import {
		buildQuizParams,
		buildReplayParams
	} from '$lib/helpers/urlParamsHelper'
	import type { Quiz } from '$lib/models/Quiz'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	let quiz = $state<Quiz | undefined>(undefined)
	let hasReplayableResults = $derived(!!$lastResults?.puzzleSet?.length)

	function navigateToQuiz(q: Quiz) {
		const params = buildQuizParams(q)
		goto(`/quiz?${params}`)
	}

	const replayLastResults = () => {
		if (!$lastResults?.puzzleSet?.length) return
		goto(`/quiz?${buildReplayParams($lastResults.quiz)}`)
	}

	const showResults = () => {
		if (!quiz) return
		const menuParams = buildQuizParams(quiz)
		menuParams.set('animate', 'false')
		goto(`/results?${menuParams}`)
	}

	$effect(() => {
		const skills = untrack(() => $adaptiveSkills)
		quiz = initQuizFromQuery(data.query, skills)
	})
</script>

{#if quiz}
	<MenuView
		bind:quiz
		onGetReady={navigateToQuiz}
		onReplay={hasReplayableResults ? replayLastResults : undefined}
		onShowResults={$lastResults ? showResults : undefined}
	/>
{/if}
