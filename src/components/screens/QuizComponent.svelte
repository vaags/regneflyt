<script lang="ts">
	import { onMount } from 'svelte'
	import { fade } from 'svelte/transition'
	import PuzzleComponent from './PuzzleComponent.svelte'
	import type { Quiz } from '../../models/Quiz'
	import type { Puzzle } from '../../models/Puzzle'
	import { AppSettings } from '../../models/constants/AppSettings'

	export let quiz: Quiz
	export let onStartQuiz: () => void = () => {}
	export let onAbortQuiz: () => void = () => {}
	export let onCompleteQuiz: (puzzleSet: Puzzle[]) => void = () => {}

	let showComponent: boolean
	let puzzleSet: Puzzle[] = []

	function startQuiz() {
		onStartQuiz()
	}

	function abortQuiz() {
		onAbortQuiz()
	}

	function completeQuiz() {
		onCompleteQuiz(puzzleSet)
	}

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
			onStartQuiz={startQuiz}
			onQuizTimeout={completeQuiz}
			onAddPuzzle={addPuzzle}
			onAbortQuiz={abortQuiz}
			onCompleteQuiz={completeQuiz}
		/>
	</div>
{/if}
