<script lang="ts">
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import MenuView from './MenuView.svelte'
	import { operatorSkills } from '#lib/stores.ts'
	import { buildQuizPath } from '#lib/helpers/quiz/quizPathHelper.ts'
	import { resolveMenuQuiz } from '#lib/helpers/quiz/quizStateHelper.ts'
	import type { Quiz } from '#lib/domain/quiz/quiz.ts'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	let quiz = $state<Quiz | undefined>(undefined)

	function navigateToQuiz(q: Quiz) {
		void goto(buildQuizPath(q))
	}

	$effect(() => {
		const skills = untrack(() => operatorSkills.current)
		quiz = resolveMenuQuiz(data.query, skills)
	})
</script>

{#if quiz}
	<MenuView bind:quiz onGetReady={navigateToQuiz} />
{/if}
