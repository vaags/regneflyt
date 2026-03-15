<script lang="ts">
	import { setContext } from 'svelte'
	import PuzzleComponent from './PuzzleComponent.svelte'
	import type { Quiz } from '$lib/models/Quiz'
	import type { Puzzle } from '$lib/models/Puzzle'

	let {
		quiz,
		onCompleteQuiz = () => {}
	}: {
		quiz: Quiz
		onCompleteQuiz?: (puzzleSet: Puzzle[], timedOut: boolean) => void
	} = $props()

	let puzzleSet: Puzzle[] = $state([])

	function completeQuiz(timedOut: boolean) {
		onCompleteQuiz(puzzleSet, timedOut)
	}

	setContext('completeQuiz', () => completeQuiz(false))

	function addPuzzle(puzzle: Puzzle) {
		puzzleSet = [...puzzleSet, puzzle]
	}
</script>

<PuzzleComponent
	seconds={quiz.duration * 60}
	{quiz}
	onQuizTimeout={() => completeQuiz(true)}
	onAddPuzzle={addPuzzle}
/>
