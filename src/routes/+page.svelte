<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import MenuComponent from '$lib/components/screens/MenuComponent.svelte'
	import { adaptiveSkills, lastResults } from '$lib/stores'
	import { getQuiz } from '$lib/helpers/quizHelper'
	import {
		buildQuizParams,
		buildReplayParams
	} from '$lib/helpers/urlParamsHelper'
	import type { Quiz } from '$lib/models/Quiz'

	let quiz = $state<Quiz>(undefined!)

	function navigateToQuiz(q: Quiz) {
		const params = buildQuizParams(q)
		goto(`/quiz?${params}`)
	}

	const replayLastResults = () => {
		if (!$lastResults) return
		goto(`/quiz?${buildReplayParams($lastResults.quiz)}`)
	}

	const showResults = () => {
		const menuParams = buildQuizParams(quiz)
		menuParams.set('animate', 'false')
		goto(`/results?${menuParams}`)
	}

	onMount(() => {
		const params = new URLSearchParams(window.location.search)
		const q = getQuiz(params)
		q.adaptiveSkillByOperator = [...$adaptiveSkills]
		quiz = q
	})
</script>

{#if quiz}
	<MenuComponent
		bind:quiz
		onGetReady={navigateToQuiz}
		onReplay={$lastResults ? replayLastResults : undefined}
		onShowResults={$lastResults ? showResults : undefined}
	/>
{/if}
