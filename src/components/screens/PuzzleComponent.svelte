<script lang="ts">
	import { tick } from 'svelte'
	import TweenedValueComponent from '../widgets/TweenedValueComponent.svelte'
	import TimeoutComponent from '../widgets/TimeoutComponent.svelte'
	import { getPuzzle } from '../../helpers/puzzleHelper'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import type { Quiz } from '../../models/Quiz'
	import type { Puzzle, PuzzlePartIndex } from '../../models/Puzzle'
	import { TimerState } from '../../models/constants/TimerState'
	import { AppSettings } from '../../models/constants/AppSettings'
	import { getOperatorSign } from '../../models/constants/Operator'
	import NumpadComponent from '../widgets/NumpadComponent.svelte'
	import CancelComponent from '../screens/CancelComponent.svelte'
	import { QuizState } from '../../models/constants/QuizState'
	import { getUpdatedSkill } from '../../models/AdaptiveProfile'

	export let quiz: Quiz
	export let seconds: number
	export let onAbortQuiz: () => void = () => {}
	export let onStartQuiz: () => void = () => {}
	export let onCompleteQuiz: () => void = () => {}
	export let onAddPuzzle: (puzzle: Puzzle) => void = () => {}
	export let onQuizTimeout: () => void = () => {}

	let quizSecondsLeft: number = seconds

	let puzzleNumber = 0
	let validationError = false
	let startTime: number
	let missingUserInput: boolean
	let puzzleTimeoutState: TimerState = TimerState.Initialized
	let quizTimeoutState: TimerState = TimerState.Initialized

	let puzzle = generatePuzzle(undefined)

	$: displayError = missingUserInput && validationError
	$: quizAlmostFinished = quizSecondsLeft <= 5

	$: missingUserInput =
		puzzle.parts[puzzle.unknownPuzzlePart].userDefinedValue === undefined ||
		Object.is(puzzle.parts[puzzle.unknownPuzzlePart].userDefinedValue, -0)

	/** Delay puzzle startTime and puzzle timer by the tween animation duration. */
	function deferPuzzleStart() {
		setTimeout(() => {
			startTime = Date.now()
			puzzleTimeoutState = TimerState.Started
		}, AppSettings.transitionDuration.duration)
	}

	function generatePuzzle(previousPuzzle: Puzzle | undefined) {
		puzzleNumber++

		let puzzle = getPuzzle(quiz, previousPuzzle)
		puzzle.timeout = false

		if (previousPuzzle) {
			// Stop the puzzle timer while the tween plays
			puzzleTimeoutState = TimerState.Stopped

			// Quiz timer: resume after tween if it was stopped (timeout flow),
			// otherwise leave it running so the configured duration is respected.
			if (
				quizTimeoutState === TimerState.Stopped ||
				quizTimeoutState === TimerState.Finished
			) {
				setTimeout(() => {
					quizTimeoutState = TimerState.Resumed
				}, AppSettings.transitionDuration.duration)
			}

			deferPuzzleStart()
		}

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
		onAbortQuiz()
	}

	function startQuiz() {
		puzzle.parts[puzzle.unknownPuzzlePart].userDefinedValue = undefined
		onStartQuiz()

		// Both timers are about to mount with internalState=Initialized.
		// Keep state as Initialized (falsy) so the reactive guard won't fire
		// on mount, then start both after the tween animation finishes.
		setTimeout(() => {
			startTime = Date.now()
			puzzleTimeoutState = TimerState.Started
			quizTimeoutState = TimerState.Started
		}, AppSettings.transitionDuration.duration)
	}

	function completeQuiz() {
		onCompleteQuiz()
	}

	async function completePuzzle(generateNextPuzzle: boolean) {
		puzzleTimeoutState = TimerState.Stopped
		let finishTime = Date.now()
		await tick() // Wait for timeoutcomponent to reset puzzle timer (it listens to the puzzleTimeoutState value)
		puzzle.isCorrect = puzzle.timeout
			? false
			: answerIsCorrect(puzzle, puzzle.unknownPuzzlePart)
		puzzle.duration = (finishTime - startTime) / 1000

		quiz.adaptiveSkillByOperator[puzzle.operator] = getUpdatedSkill(
			quiz.adaptiveSkillByOperator[puzzle.operator],
			!!puzzle.isCorrect,
			puzzle.duration,
			puzzle.timeout
		)

		onAddPuzzle({ ...puzzle })

		if (generateNextPuzzle) puzzle = generatePuzzle(puzzle)
	}

	function answerIsCorrect(puzzle: Puzzle, unknownPuzzlePart: PuzzlePartIndex) {
		return (
			puzzle.parts[unknownPuzzlePart].userDefinedValue ===
			puzzle.parts[unknownPuzzlePart].generatedValue
		)
	}

	function puzzleIsValid() {
		if (missingUserInput) {
			validationError = true
			return false
		}

		validationError = false

		return true
	}

	function quizTimeout() {
		onQuizTimeout()
	}

	function secondChange(remainingSeconds: number) {
		quizSecondsLeft = remainingSeconds
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
				? 'font-semibold text-yellow-700 dark:text-yellow-300'
				: 'text-gray-900 dark:text-gray-100'}"
		>
			{#if quiz.state === QuizState.Started}
				<TimeoutComponent
					{seconds}
					state={quizTimeoutState}
					onSecondChange={secondChange}
					onFinished={quizTimeout}
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
						onFinished={startQuiz}
					/>
				{:else}
					{#each puzzle.parts as part, i}
						{#if puzzle.unknownPuzzlePart === i}
							<span class="text-blue-700 dark:text-blue-300"
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
							<span class="mr-2">
								{getOperatorSign(puzzle.operator)}
							</span>
						{:else if i === 1}<span class="mr-2">=</span>{/if}
					{/each}
				{/if}
			</div>
			<div class="flex items-center justify-between text-sm">
				<div class="flex-1"></div>
				<div>
					{#if quiz.state === QuizState.Started && quiz.puzzleTimeLimit}
						<TimeoutComponent
							state={puzzleTimeoutState}
							showProgressBar={true}
							seconds={AppSettings.regneflytThresholdSeconds}
							onFinished={timeOutPuzzle}
						>
							{#if puzzle.timeout}
								<TimeoutComponent
									seconds={AppSettings.separatorPageDuration}
									countToZero={false}
									fadeOnSecondChange={true}
									onFinished={() => (puzzle = generatePuzzle(puzzle))}
								/>
							{:else}
								{@html '&nbsp;'}
							{/if}
						</TimeoutComponent>
					{/if}
				</div>
				<div class="flex-1">
					<CancelComponent
						showCompleteButton={!AppSettings.isProduction}
						onAbortQuiz={abortQuiz}
						onCompleteQuiz={completeQuiz}
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
		onCompletePuzzle={() =>
			puzzle.timeout
				? (puzzle = generatePuzzle(puzzle))
				: completePuzzleIfValid()}
	/>
</form>
