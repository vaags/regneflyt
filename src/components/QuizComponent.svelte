<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte'
	import { fade } from 'svelte/transition'
	import PuzzleComponent from './PuzzleComponent.svelte'
	import type { Quiz } from '../models/Quiz'
	import type { Puzzle } from '../models/Puzzle'
	import { AppSettings } from '../models/constants/AppSettings'
	import { QuizState } from '../models/constants/QuizState'
	import PanelComponent from './widgets/PanelComponent.svelte'
	import TimeoutComponent from './widgets/TimeoutComponent.svelte'
	import NumpadComponent from './widgets/NumpadComponent.svelte'

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

	function addPuzzle(event: any) {
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
		{#if quiz.state === QuizState.AboutToStart}
			<PanelComponent heading="Gjør deg klar&hellip;">
				<p class="my-9 text-center text-6xl md:text-7xl">
					<TimeoutComponent
						seconds={AppSettings.separatorPageDuration}
						countToZero={false}
						fadeOnSecondChange={true}
						on:finished={startQuiz}
					/>
				</p>
			</PanelComponent>
			<NumpadComponent nextButtonColor="green" />
		{:else}
			<PuzzleComponent
				seconds={quiz.duration * 60}
				{quiz}
				on:quizTimeout={completeQuiz}
				on:addPuzzle={addPuzzle}
				on:abortQuiz={abortQuiz}
				on:completeQuiz={completeQuiz}
			/>
		{/if}
	</div>
{/if}
