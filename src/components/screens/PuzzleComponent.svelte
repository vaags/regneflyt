<script lang="ts">
	import { createEventDispatcher, tick } from 'svelte'
	import TweenedValueComponent from '../widgets/TweenedValueComponent.svelte'
	import TimeoutComponent from '../widgets/TimeoutComponent.svelte'
	import { getPuzzle } from '../../helpers/puzzleHelper'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import type { Quiz } from '../../models/Quiz'
	import type { Puzzle } from '../../models/Puzzle'
	import { TimerState } from '../../models/constants/TimerState'
	import { AppSettings } from '../../models/constants/AppSettings'
	import NumpadComponent from '../widgets/NumpadComponent.svelte'
	import CancelComponent from '../screens/CancelComponent.svelte'
	import { QuizState } from '../../models/constants/QuizState'

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

	$: missingUserInput =
		puzzle.parts[puzzle.unknownPuzzlePart].userDefinedValue === undefined ||
		Object.is(puzzle.parts[puzzle.unknownPuzzlePart].userDefinedValue, -0)

	function generatePuzzle(
		previousPuzzle: Puzzle | undefined,
		resumeTimer = false
	) {
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
		puzzle.parts[puzzle.unknownPuzzlePart].userDefinedValue = undefined
		dispatch('startQuiz')
	}

	function completeQuiz() {
		dispatch('completeQuiz')
	}

	async function completePuzzle(generateNextPuzzle: boolean) {
		puzzleTimeoutState = TimerState.Stopped
		let finishTime = Date.now()
		await tick() // Wait for timeoutcomponent to reset puzzle timer (it listens to the puzzleTimeoutState value)
		puzzle.isCorrect = puzzle.timeout
			? false
			: answerIsCorrect(puzzle, puzzle.unknownPuzzlePart)
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

	function secondChange(event: CustomEvent) {
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
				? 'font-semibold text-yellow-700'
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

		<div class="text-center text-4xl md:text-5xl">
			<div class="mb-4">
				{#if quiz.state === QuizState.AboutToStart}
					<TimeoutComponent
						seconds={AppSettings.separatorPageDuration}
						countToZero={false}
						customDisplayWords={['Gå!', 'Ferdig', 'Klar']}
						fadeOnSecondChange={true}
						on:finished={startQuiz}
					/>
				{:else}
					{#each puzzle.parts as part, i}
						{#if puzzle.unknownPuzzlePart === i}
							<span class="text-blue-700"
								>{part.userDefinedValue === undefined
									? '?'
									: Object.is(part.userDefinedValue, -0)
										? '-'
										: part.userDefinedValue}</span
							>
						{:else}
							<TweenedValueComponent value={part.generatedValue} />
						{/if}
						{#if i === 0}
							<span>
								<!-- eslint-disable -->
								{@html puzzle.operatorLabel}
								<!-- eslint-enable -->
							</span>
						{:else if i === 1}<span class="mr-2">=</span>{/if}
					{/each}
				{/if}
			</div>
			<div class="flex items-center justify-between text-sm">
				<div class="flex-1" />
				<div>
					{#if quiz.state === QuizState.Started && quiz.puzzleTimeLimit}
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
								<!-- eslint-disable -->
								{@html '&nbsp;'}
								<!-- eslint-enable -->
							{/if}
						</TimeoutComponent>
					{/if}
				</div>
				<div class="flex-1">
					<CancelComponent
						showCompleteButton={!AppSettings.isProduction}
						on:abortQuiz={abortQuiz}
						on:completeQuiz={completeQuiz}
					/>
				</div>
			</div>
		</div>
	</PanelComponent>
	<NumpadComponent
		disabledNext={displayError}
		puzzleTimeout={puzzle.timeout}
		nextButtonColor={displayError ? 'red' : puzzle.timeout ? 'yellow' : 'green'}
		bind:value={puzzle.parts[puzzle.unknownPuzzlePart].userDefinedValue}
		on:completePuzzle={() =>
			puzzle.timeout
				? (puzzle = generatePuzzle(puzzle, true))
				: completePuzzleIfValid()}
	/>
</form>
