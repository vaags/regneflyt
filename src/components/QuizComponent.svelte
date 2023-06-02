<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte'
	import { fade } from 'svelte/transition'
	import PuzzleComponent from './PuzzleComponent.svelte'
	import type { Quiz } from '../models/Quiz'
	import type { Puzzle } from '../models/Puzzle'
	import { AppSettings } from '../models/constants/AppSettings'

	export let quiz: Quiz

	const dispatch = createEventDispatcher()
	let showComponent: boolean
	let puzzleSet: Puzzle[] = []

	function startQuiz() {
		dispatch('startQuiz')
	}

	function abortQuiz() {
		dispatch('abortQuiz')
	}

	function completeQuiz() {
		dispatch('completeQuiz', { puzzleSet })
	}

	function addPuzzle(event: CustomEvent) {
		puzzleSet = [...puzzleSet, event.detail.puzzle]
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
			on:startQuiz={startQuiz}
			on:quizTimeout={completeQuiz}
			on:addPuzzle={addPuzzle}
			on:abortQuiz={abortQuiz}
			on:completeQuiz={completeQuiz}
		/>
	</div>
{/if}
