<script lang="ts">
	import { goto } from '$app/navigation'
	import ResultsView from './ResultsView.svelte'
	import { lastResults } from '#lib/stores.ts'
	import { buildQuizPath } from '#lib/helpers/quiz/quizPathHelper.ts'
	import { resolveResultsFallbackQuiz } from '#lib/helpers/quiz/quizStateHelper.ts'
	import type { Quiz } from '#lib/models/Quiz.ts'
	import type { QuizStats } from '#lib/models/QuizStats.ts'
	import { defaultAdaptiveSkillMap } from '#lib/models/AdaptiveProfile.ts'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()
	let fallbackQuiz = $derived.by(() => resolveResultsFallbackQuiz(data.menuUrl))
	const fallbackQuizStats: QuizStats = {
		correctAnswerCount: 0,
		correctAnswerPercentage: 0,
		starCount: 0
	}

	let results = $derived(lastResults.current)

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
/>
