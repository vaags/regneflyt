<script lang="ts">
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import MenuView from './MenuView.svelte'
	import { adaptiveSkills, lastResults } from '$lib/stores'
	import {
		buildQuizPath,
		buildReplayQuizPath
	} from '$lib/helpers/quiz/quizPathHelper'
	import { resolveMenuQuiz } from '$lib/helpers/quiz/quizStateHelper'
	import type { Quiz } from '$lib/models/Quiz'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	let quiz = $state<Quiz | undefined>(undefined)
	let hasReplayableResults = $derived(!!lastResults.current?.puzzleSet?.length)

	function navigateToQuiz(q: Quiz) {
		void goto(buildQuizPath(q))
	}

	const replayLastResults = () => {
		const replayPath = buildReplayQuizPath(lastResults.current)
		if (replayPath === undefined) return
		void goto(replayPath)
	}

	$effect(() => {
		const skills = untrack(() => adaptiveSkills.current)
		quiz = resolveMenuQuiz(data.query, skills)
	})
</script>

{#if quiz}
	<MenuView
		bind:quiz
		onGetReady={navigateToQuiz}
		onReplay={hasReplayableResults ? replayLastResults : undefined}
	/>
{/if}
