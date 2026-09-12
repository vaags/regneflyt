<script lang="ts">
	import Layout from '../../../src/routes/+layout.svelte'
	import type { LayoutData } from '../../../src/routes/$types'
	import ResultsView from '../../../src/routes/results/ResultsView.svelte'
	import type { Puzzle } from '../../../src/lib/domain/puzzle-generation/puzzle'
	import type { QuizStats } from '../../../src/lib/models/QuizStats'
	import type { Quiz } from '../../../src/lib/domain/quiz/quiz'
	import type { OperatorSkillMap } from '../../../src/lib/domain/skill-progression/skillModel'

	let {
		puzzleSet,
		quizStats,
		quiz,
		preQuizSkill,
		animateSkill = false,
		onGetReady = () => {},
		data = {
			pathname: '/results',
			search: '',
			pageTitleKey: 'results',
			locale: 'en'
		} as LayoutData
	}: {
		puzzleSet: Puzzle[]
		quizStats: QuizStats
		quiz: Quiz
		preQuizSkill: OperatorSkillMap
		animateSkill?: boolean
		onGetReady?: (quiz: Quiz) => void
		data?: LayoutData
	} = $props()
</script>

<Layout {data}>
	<ResultsView
		{puzzleSet}
		{quizStats}
		{quiz}
		{preQuizSkill}
		{animateSkill}
		{onGetReady}
	/>
</Layout>
