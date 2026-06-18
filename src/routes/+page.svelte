<script lang="ts">
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import MenuView from './MenuView.svelte'
	import { adaptiveSkills } from '$lib/stores'
	import { buildQuizPath } from '$lib/helpers/quiz/quizPathHelper'
	import { resolveMenuQuiz } from '$lib/helpers/quiz/quizStateHelper'
	import type { Quiz } from '$lib/models/Quiz'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	let quiz = $state<Quiz | undefined>(undefined)

	function navigateToQuiz(q: Quiz) {
		void goto(buildQuizPath(q))
	}

	$effect(() => {
		const skills = untrack(() => adaptiveSkills.current)
		quiz = resolveMenuQuiz(data.query, skills)
	})
</script>

{#if quiz}
	<MenuView bind:quiz onGetReady={navigateToQuiz} />
{/if}
