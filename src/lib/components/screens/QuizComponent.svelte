<script lang="ts">
	import PuzzleComponent from './PuzzleComponent.svelte'
	import type { Quiz } from '$lib/models/Quiz'
	import type { Puzzle } from '$lib/models/Puzzle'

	let {
		quiz,
		onStartQuiz = () => {},
		onAbortQuiz = () => {},
		onCompleteQuiz = () => {}
	}: {
		quiz: Quiz
		onStartQuiz?: () => void
		onAbortQuiz?: () => void
		onCompleteQuiz?: (puzzleSet: Puzzle[], timedOut: boolean) => void
	} = $props()

	let puzzleSet: Puzzle[] = $state([])

	function completeQuiz(timedOut: boolean) {
		onCompleteQuiz(puzzleSet, timedOut)
	}

	function addPuzzle(puzzle: Puzzle) {
		puzzleSet = [...puzzleSet, puzzle]
	}
</script>

<PuzzleComponent
	seconds={quiz.duration * 60}
	{quiz}
	{onStartQuiz}
	{onAbortQuiz}
	onCompleteQuiz={() => completeQuiz(false)}
	onQuizTimeout={() => completeQuiz(true)}
	onAddPuzzle={addPuzzle}
/>
