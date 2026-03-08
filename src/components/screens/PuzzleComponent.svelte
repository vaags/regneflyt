<script lang="ts">
	import { tick, getContext } from 'svelte'
	import { fade } from 'svelte/transition'
	import TweenedValueComponent from '../widgets/TweenedValueComponent.svelte'
	import TimeoutComponent from '../widgets/TimeoutComponent.svelte'
	import { getPuzzle } from '../../helpers/puzzleHelper'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import type { Quiz } from '../../models/Quiz'
	import type { Puzzle } from '../../models/Puzzle'
	import { TimerState } from '../../models/constants/TimerState'
	import { AppSettings } from '../../models/constants/AppSettings'
	import { getOperatorSign } from '../../models/constants/Operator'
	import NumpadComponent from '../widgets/NumpadComponent.svelte'
	import CancelComponent from '../screens/CancelComponent.svelte'
	import { QuizState } from '../../models/constants/QuizState'
	import { applySkillUpdate } from '../../helpers/adaptiveHelper'

	export let quiz: Quiz
	export let seconds: number
	export let onAddPuzzle: (puzzle: Puzzle) => void = () => {}
	export let onQuizTimeout: () => void = () => {}

	const onStartQuiz = getContext<() => void>('startQuiz')

	let quizSecondsLeft: number = seconds
	let puzzleNumber = 0
	let validationError = false
	let startTime: number
	let progressBarState: TimerState = TimerState.Initialized
	let quizTimeoutState: TimerState = TimerState.Initialized

	let puzzle = generatePuzzle(undefined)

	$: quizAlmostFinished = quizSecondsLeft <= 5

	$: missingUserInput =
		puzzle.parts[puzzle.unknownPuzzlePart].userDefinedValue === undefined ||
		Object.is(puzzle.parts[puzzle.unknownPuzzlePart].userDefinedValue, -0)

	$: displayError = missingUserInput && validationError

	// --- Puzzle lifecycle ---

	function generatePuzzle(previousPuzzle: Puzzle | undefined) {
		puzzleNumber++

		const puzzle = getPuzzle(quiz, previousPuzzle)

		// First puzzle: timers don't exist yet — startQuiz() handles the deferral.
		// Subsequent puzzles: defer timers while the tween animation plays.
		if (previousPuzzle) deferTimersForTween()

		return puzzle
	}

	function startQuiz() {
		puzzle.parts[puzzle.unknownPuzzlePart].userDefinedValue = undefined
		onStartQuiz()

		// Immediately set Stopped so the progress bar and quiz timer render during the tween.
		// Stopped (3) is truthy, so the reactive guard in TimeoutComponent won't hide them.
		progressBarState = TimerState.Stopped
		quizTimeoutState = TimerState.Stopped

		// Start both timers after the number tween finishes.
		setTimeout(() => {
			startTime = Date.now()
			progressBarState = TimerState.Started
			quizTimeoutState = TimerState.Started
		}, AppSettings.transitionDuration.duration)
	}

	function submitAnswer() {
		if (missingUserInput) {
			validationError = true
			return
		}
		validationError = false
		completePuzzle()
	}

	async function completePuzzle() {
		progressBarState = TimerState.Stopped
		const finishTime = Date.now()
		await tick()

		puzzle.isCorrect =
			puzzle.parts[puzzle.unknownPuzzlePart].userDefinedValue ===
			puzzle.parts[puzzle.unknownPuzzlePart].generatedValue
		puzzle.duration = (finishTime - startTime) / 1000

		applySkillUpdate(
			quiz.adaptiveSkillByOperator,
			puzzle.operator,
			puzzle.parts,
			!!puzzle.isCorrect,
			puzzle.duration
		)

		onAddPuzzle({ ...puzzle })

		puzzle = generatePuzzle(puzzle)
	}

	// --- Timer management ---

	/** Pause progress bar during tween. Resume quiz timer only if it was stopped. */
	function deferTimersForTween() {
		progressBarState = TimerState.Stopped

		const quizTimerWasStopped =
			quizTimeoutState === TimerState.Stopped ||
			quizTimeoutState === TimerState.Finished

		if (quizTimerWasStopped) {
			setTimeout(() => {
				quizTimeoutState = TimerState.Resumed
			}, AppSettings.transitionDuration.duration)
		}

		setTimeout(() => {
			startTime = Date.now()
			progressBarState = TimerState.Started
		}, AppSettings.transitionDuration.duration)
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
					onSecondChange={(s) => (quizSecondsLeft = s)}
					onFinished={onQuizTimeout}
					showMinutes={true}
				/>
			{/if}
		</div>

		<div class="text-center text-4xl md:text-5xl">
			<div class="mb-4 min-h-[1em]">
				{#if quiz.state === QuizState.AboutToStart}
					<TimeoutComponent
						seconds={AppSettings.separatorPageDuration}
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
					{#if quiz.state === QuizState.Started && !quiz.hidePuzzleProgressBar}
						<div
							in:fade={{ duration: AppSettings.transitionDuration.duration }}
						>
							<TimeoutComponent
								state={progressBarState}
								showProgressBar={true}
								seconds={AppSettings.regneflytThresholdSeconds}
							/>
						</div>
					{/if}
				</div>
				<div class="flex-1">
					<CancelComponent showCompleteButton={!AppSettings.isProduction} />
				</div>
			</div>
		</div>
	</PanelComponent>
	<NumpadComponent
		disabledNext={displayError}
		nextButtonColor={displayError ? 'red' : 'green'}
		bind:value={puzzle.parts[puzzle.unknownPuzzlePart].userDefinedValue}
		onCompletePuzzle={submitAnswer}
	/>
</form>
