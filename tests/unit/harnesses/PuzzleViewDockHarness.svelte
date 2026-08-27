<script lang="ts">
	import { onMount } from 'svelte'
	import PuzzleView from '../../../src/routes/quiz/PuzzleView.svelte'
	import GlobalNav from '$lib/components/layout/GlobalNav.svelte'
	import {
		setStickyGlobalNavContext,
		type StickyGlobalNavQuizControls
	} from '$lib/contexts/stickyGlobalNavContext'
	import type { Quiz } from '$lib/models/Quiz'
	import type { Puzzle } from '$lib/models/Puzzle'

	let {
		quiz,
		seconds,
		onStartQuiz = () => {},
		onAbortQuiz = () => {},
		onCompleteQuiz = () => {},
		onAddPuzzle = () => {},
		onQuizTimeout = () => {}
	}: {
		quiz: Quiz
		seconds: number
		onStartQuiz?: () => void
		onAbortQuiz?: () => void
		onCompleteQuiz?: () => void
		onAddPuzzle?: (puzzle: Puzzle) => void
		onQuizTimeout?: () => void
	} = $props()

	let quizControls = $state<StickyGlobalNavQuizControls | undefined>(undefined)
	let mainContent: HTMLElement
	const noop = () => {}

	setStickyGlobalNavContext({
		registerStartActions: () => noop,
		registerQuizControls: (controls) => {
			quizControls = controls
			return () => {
				quizControls = undefined
			}
		}
	})

	onMount(() => mainContent.focus())
</script>

<main id="main-content" tabindex="-1" bind:this={mainContent}>
	<PuzzleView
		{quiz}
		{seconds}
		{onStartQuiz}
		{onAbortQuiz}
		{onCompleteQuiz}
		{onAddPuzzle}
		{onQuizTimeout}
	/>
</main>

<GlobalNav
	locale="nb"
	pathname="/quiz"
	mode="quiz"
	{quizControls}
	onStart={noop}
	onNavigateMenu={noop}
	onNavigateResults={noop}
	onNavigateSettings={noop}
	onCopyLink={noop}
/>
