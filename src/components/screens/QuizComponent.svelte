<script lang="ts">
	import { onMount, setContext } from 'svelte'
	import { fade } from 'svelte/transition'
	import PuzzleComponent from './PuzzleComponent.svelte'
	import type { Quiz } from '../../models/Quiz'
	import type { Puzzle } from '../../models/Puzzle'
	import { AppSettings } from '../../models/constants/AppSettings'

	let {
		quiz,
		onCompleteQuiz = () => {}
	}: {
		quiz: Quiz
		onCompleteQuiz?: (puzzleSet: Puzzle[], timedOut: boolean) => void
	} = $props()

	let showComponent = $state(false)
	let puzzleSet: Puzzle[] = $state([])

	function completeQuiz(timedOut: boolean) {
		onCompleteQuiz(puzzleSet, timedOut)
	}

	setContext('completeQuiz', () => completeQuiz(false))

	function addPuzzle(puzzle: Puzzle) {
		puzzleSet = [...puzzleSet, puzzle]
	}

	onMount(() => {
		setTimeout(() => {
			showComponent = true
		}, AppSettings.pageTransitionDuration.duration)
	})
</script>

{#if showComponent}
	<div transition:fade={AppSettings.pageTransitionDuration}>
		<PuzzleComponent
			seconds={quiz.duration * 60}
			{quiz}
			onQuizTimeout={() => completeQuiz(true)}
			onAddPuzzle={addPuzzle}
		/>
	</div>
{/if}
