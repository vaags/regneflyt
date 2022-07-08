<script lang="ts">
	import { createEventDispatcher, tick } from 'svelte'
	import TweenedValueComponent from './widgets/TweenedValueComponent.svelte'
	import TimeoutComponent from './widgets/TimeoutComponent.svelte'
	import { getPuzzle } from '../services/puzzleService'
	import PanelComponent from './widgets/PanelComponent.svelte'
	import type { Quiz } from '../models/Quiz'
	import type { Puzzle } from '../models/Puzzle'
	import { TimerState } from '../models/constants/TimerState'
	import { AppSettings } from '../models/constants/AppSettings'
	import NumpadComponent from './widgets/NumpadComponent.svelte'
	import CancelComponent from './CancelComponent.svelte'
	import { QuizState } from '../models/constants/QuizState'

	export let quiz: Quiz
	export let seconds: number

	const dispatch = createEventDispatcher()
	let quizSecondsLeft: number = seconds

	let puzzleNumber = 0
	let validationError = false
	let startTime: number
	let missingUserInput: boolean
	let puzzleTimeoutState: TimerState = TimerState.Started
	let quizTimeoutState: TimerState = TimerState.Started

	let puzzle = generatePuzzle(undefined)

	$: displayError = missingUserInput && validationError
	$: quizAlmostFinished = quizSecondsLeft <= 5

	$: missingUserInput = puzzle?.parts[puzzle.unknownPuzzlePart].userDefinedValue === undefined

	function generatePuzzle(previousPuzzle: Puzzle | undefined, resumeTimer: boolean = false) {
		puzzleNumber++

		let puzzle = getPuzzle(quiz, AppSettings.operatorSigns, previousPuzzle)
		puzzle.timeout = false
		puzzleTimeoutState = TimerState.Started

		if (resumeTimer) quizTimeoutState = TimerState.Resumed

		startTime = Date.now()

		return puzzle
	}

	function completePuzzleIfValid() {
		if (!puzzleIsValid()) return

		completePuzzle(true)
	}

	function timeOutPuzzle() {
		puzzle.timeout = true
		validationError = false

		quizTimeoutState = TimerState.Stopped
		puzzleTimeoutState = TimerState.Finished

		completePuzzle(false)
	}

	function abortQuiz() {
		dispatch('abortQuiz')
	}

	function startQuiz() {
		startTime = Date.now()
		dispatch('startQuiz')
	}

	function completeQuiz() {
		dispatch('completeQuiz')
	}

	async function completePuzzle(generateNextPuzzle: boolean) {
		puzzleTimeoutState = TimerState.Stopped
		let finishTime = Date.now()
		await tick() // Wait for timeoutcomponent to reset puzzle timer (it listens to the puzzleTimeoutState value)
		puzzle.isCorrect = puzzle.timeout ? false : answerIsCorrect(puzzle, puzzle.unknownPuzzlePart)
		puzzle.duration = (finishTime - startTime) / 1000

		dispatch('addPuzzle', { puzzle: { ...puzzle } })

		if (generateNextPuzzle) puzzle = generatePuzzle(puzzle)
	}

	function answerIsCorrect(puzzle: Puzzle, unknownPuzzlePart: number) {
		return (
			puzzle.parts[unknownPuzzlePart].userDefinedValue ===
			puzzle.parts[unknownPuzzlePart].generatedValue
		)
	}

	function puzzleIsValid() {
		if (missingUserInput) {
			validationError = true
			return
		}

		validationError = false

		return !validationError
	}

	function quizTimeout() {
		dispatch('quizTimeout')
	}

	function secondChange(event: any) {
		quizSecondsLeft = event.detail.remainingSeconds
	}
</script>

<form>
	<PanelComponent
		heading={quiz.state === QuizState.AboutToStart
			? 'Gjør deg klar ...'
			: `Oppgave ${puzzleNumber}`}
	>
		<div
			slot="label"
			class="float-right text-lg {quizAlmostFinished
				? 'text-yellow-700 font-semibold'
				: 'text-gray-700'}"
		>
			{#if quiz.state === QuizState.Started}
				<TimeoutComponent
					{seconds}
					state={quizTimeoutState}
					on:secondChange={secondChange}
					on:finished={quizTimeout}
					showMinutes={true}
				/>
			{/if}
		</div>

		<div class="mt-4 text-center text-5xl md:text-6xl">
			<div class="mb-10">
				{#if quiz.state === QuizState.AboutToStart}
					<div class="my-9 text-center text-6xl md:text-7xl">
						<TimeoutComponent
							seconds={AppSettings.separatorPageDuration}
							countToZero={false}
							fadeOnSecondChange={true}
							on:finished={startQuiz}
						/>
					</div>
				{:else}
					{#each puzzle.parts as part, i}
						{#if puzzle.unknownPuzzlePart === i}
							<span class="text-blue-700">{part.userDefinedValue || '?'}</span>
						{:else}
							<TweenedValueComponent value={part.generatedValue} />
						{/if}
						{#if i === 0}
							<span>
								{@html puzzle.operatorLabel}
							</span>
						{:else if i === 1}<span class="mr-2">=</span>{/if}
					{/each}
				{/if}
			</div>
			{#if quiz.state === QuizState.Started && quiz.puzzleTimeLimit}
				<div class="text-lg">
					<TimeoutComponent
						state={puzzleTimeoutState}
						showProgressBar={true}
						seconds={AppSettings.puzzleTimeLimitDuration}
						on:finished={timeOutPuzzle}
					>
						{#if puzzle.timeout}
							<TimeoutComponent
								seconds={AppSettings.separatorPageDuration}
								countToZero={false}
								fadeOnSecondChange={true}
								on:finished={() => (puzzle = generatePuzzle(puzzle, true))}
							/>
						{:else}
							{@html '&nbsp;'}
						{/if}
					</TimeoutComponent>
				</div>
			{/if}
			<CancelComponent
				showCompleteButton={!AppSettings.isProduction}
				on:abortQuiz={abortQuiz}
				on:completeQuiz={completeQuiz}
			/>
		</div>
	</PanelComponent>
	<NumpadComponent
		disabledNext={displayError}
		puzzleTimeout={puzzle.timeout}
		nextButtonColor={displayError ? 'red' : puzzle.timeout ? 'yellow' : 'green'}
		bind:value={puzzle.parts[puzzle.unknownPuzzlePart].userDefinedValue}
		on:completePuzzle={() =>
			puzzle.timeout ? (puzzle = generatePuzzle(puzzle, true)) : completePuzzleIfValid()}
	/>
</form>
