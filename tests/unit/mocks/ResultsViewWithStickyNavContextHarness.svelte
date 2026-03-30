<script lang="ts">
	import Layout from '../../../src/routes/+layout.svelte'
	import type { LayoutData } from '../../../src/routes/$types'
	import ResultsView from '../../../src/routes/results/ResultsView.svelte'
	import type { Puzzle } from '../../../src/lib/models/Puzzle'
	import type { QuizStats } from '../../../src/lib/models/QuizStats'
	import type { Quiz } from '../../../src/lib/models/Quiz'
	import type { AdaptiveSkillMap } from '../../../src/lib/models/AdaptiveProfile'

	let {
		puzzleSet,
		quizStats,
		quiz,
		preQuizSkill,
		animateSkill = false,
		timedOut = false,
		onGetReady = () => {},
		onReplay = undefined,
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
		preQuizSkill: AdaptiveSkillMap
		animateSkill?: boolean
		timedOut?: boolean
		onGetReady?: (quiz: Quiz) => void
		onReplay?: (() => void) | undefined
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
		{timedOut}
		{onGetReady}
		{onReplay}
	/>
</Layout>
