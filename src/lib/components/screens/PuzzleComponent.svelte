<script lang="ts">
	import { tick, getContext, untrack } from 'svelte'
	import { fade } from 'svelte/transition'
	import * as m from '$lib/paraglide/messages.js'
	import TweenedValueComponent from '../widgets/TweenedValueComponent.svelte'
	import TimeoutComponent from '../widgets/TimeoutComponent.svelte'
	import { getPuzzle } from '$lib/helpers/puzzleHelper'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import type { Quiz } from '$lib/models/Quiz'
	import type { Puzzle } from '$lib/models/Puzzle'
	import { TimerState } from '$lib/constants/TimerState'
	import { AppSettings } from '$lib/constants/AppSettings'
	import { getOperatorSign } from '$lib/constants/Operator'
	import NumpadComponent from '../widgets/NumpadComponent.svelte'
	import DialogComponent from '../widgets/DialogComponent.svelte'
	import ButtonComponent from '../widgets/ButtonComponent.svelte'
	import CloseButtonComponent from '../widgets/CloseButtonComponent.svelte'
	import { QuizState } from '$lib/constants/QuizState'
	import { applySkillUpdate } from '$lib/helpers/adaptiveHelper'
	import { createRng } from '$lib/helpers/rng'

	let {
		quiz,
		seconds,
		onAddPuzzle = () => {},
		onQuizTimeout = () => {}
	}: {
		quiz: Quiz
		seconds: number
		onAddPuzzle?: (puzzle: Puzzle) => void
		onQuizTimeout?: () => void
	} = $props()

	const onStartQuiz = getContext<() => void>('startQuiz')
	const onAbortQuiz = getContext<() => void>('abortQuiz')
	const onCompleteQuiz = getContext<() => void>('completeQuiz')
	const initialSeconds = untrack(() => seconds)
	let quitDialog = $state<DialogComponent>(undefined!)
	let completeDialog = $state<DialogComponent>(undefined!)
	const isUnlimited = initialSeconds === 0

	let quizSecondsLeft = $state(initialSeconds)
	let puzzleNumber = $state(0)
	let validationError = $state(false)
	let inputLocked = $state(false)
	let startTime: number
	let progressBarState: TimerState = $state(TimerState.Initialized)
	let quizTimeoutState: TimerState = $state(TimerState.Initialized)

	const recentPuzzleHistorySize = 5
	let recentPuzzles: Puzzle[] = []
	let consecutiveCorrect = 0
	const rawReplay = untrack(() => quiz.replayPuzzles)
	const replayPuzzles = rawReplay?.length ? rawReplay : undefined
	const { rng } = createRng(untrack(() => quiz.seed))
	let puzzle = $state(generatePuzzle())

	let quizAlmostFinished = $derived(!isUnlimited && quizSecondsLeft <= 5)

	let missingUserInput = $derived(
		puzzle.parts[puzzle.unknownPartIndex].userDefinedValue === undefined ||
			Object.is(puzzle.parts[puzzle.unknownPartIndex].userDefinedValue, -0)
	)

	let displayError = $derived(missingUserInput && validationError)

	let puzzleReady = $derived(quiz.state === QuizState.Started)

	let puzzleExpression = $derived.by(() => {
		const parts = puzzle.parts
		const sign = getOperatorSign(puzzle.operator)
		const values = parts.map((p, i) =>
			i === puzzle.unknownPartIndex ? '?' : String(p.generatedValue)
		)
		return `${values[0]}${sign}${values[1]}=${values[2]}`
	})

	// --- Puzzle lifecycle ---

	function resetPuzzle(source: Puzzle): Puzzle {
		return {
			...source,
			parts: source.parts.map((p) => ({
				...p,
				userDefinedValue: undefined
			})) as Puzzle['parts'],
			duration: 0,
			isCorrect: undefined
		}
	}

	function generatePuzzle() {
		puzzleNumber++

		const replayPuzzle = replayPuzzles?.[puzzleNumber - 1]
		const puzzle = replayPuzzle
			? resetPuzzle(replayPuzzle)
			: getPuzzle(rng, quiz, recentPuzzles)

		recentPuzzles = [...recentPuzzles, puzzle].slice(-recentPuzzleHistorySize)

		// First puzzle: timers don't exist yet — startQuiz() handles the deferral.
		// Subsequent puzzles: defer timers while the tween animation plays.
		if (puzzleNumber > 1) deferTimersForTween()

		return puzzle
	}

	function startQuiz() {
		puzzle.parts[puzzle.unknownPartIndex].userDefinedValue = undefined
		onStartQuiz()

		// Immediately set Stopped so the progress bar and quiz timer render during the tween.
		// Stopped (3) is truthy, so the reactive guard in TimeoutComponent won't hide them.
		progressBarState = TimerState.Stopped
		if (!isUnlimited) quizTimeoutState = TimerState.Stopped

		// Start both timers after the number tween finishes.
		setTimeout(() => {
			startTime = Date.now()
			progressBarState = TimerState.Started
			if (!isUnlimited) quizTimeoutState = TimerState.Started
		}, AppSettings.transitionDuration.duration)
	}

	function submitAnswer() {
		if (puzzle.isCorrect === false) return
		if (missingUserInput) {
			validationError = true
			return
		}
		validationError = false
		completePuzzle()
	}

	async function completePuzzle() {
		inputLocked = true
		progressBarState = TimerState.Paused
		const finishTime = Date.now()
		await tick()

		puzzle.isCorrect =
			puzzle.parts[puzzle.unknownPartIndex].userDefinedValue ===
			puzzle.parts[puzzle.unknownPartIndex].generatedValue
		puzzle.duration = (finishTime - startTime) / 1000

		if (puzzle.isCorrect) {
			consecutiveCorrect++
			progressBarState = TimerState.Stopped
		} else {
			consecutiveCorrect = 0
		}

		applySkillUpdate(
			quiz.adaptiveSkillByOperator,
			puzzle.operator,
			puzzle.parts,
			!!puzzle.isCorrect,
			puzzle.duration,
			consecutiveCorrect
		)

		onAddPuzzle({ ...puzzle })

		if (replayPuzzles && puzzleNumber >= replayPuzzles.length) {
			onQuizTimeout()
			return
		}

		if (!puzzle.isCorrect) {
			await new Promise((r) =>
				setTimeout(r, AppSettings.correctionWrongDuration)
			)
		}

		inputLocked = false
		puzzle = generatePuzzle()
	}

	// --- Timer management ---

	/** Pause progress bar during tween. Resume quiz timer only if it was stopped. */
	function deferTimersForTween() {
		progressBarState = TimerState.Stopped

		if (!isUnlimited) {
			const quizTimerWasStopped =
				quizTimeoutState === TimerState.Stopped ||
				quizTimeoutState === TimerState.Finished

			if (quizTimerWasStopped) {
				setTimeout(() => {
					quizTimeoutState = TimerState.Resumed
				}, AppSettings.transitionDuration.duration)
			}
		}

		setTimeout(() => {
			startTime = Date.now()
			progressBarState = TimerState.Started
		}, AppSettings.transitionDuration.duration)
	}
</script>

<form
	data-puzzle-state={puzzleReady ? 'ready' : 'countdown'}
	data-puzzle-number={puzzleNumber}
	data-puzzle-expression={puzzleReady ? puzzleExpression : undefined}
	aria-label={m.sr_puzzle_input({ number: puzzleNumber })}
>
	{#snippet labelSnippet()}
		<div class="-mt-5 -mr-5">
			<CloseButtonComponent
				onclick={() => quitDialog.open()}
				ariaLabel={m.cancel_undo()}
				testId="btn-cancel"
			/>
		</div>
	{/snippet}
	<PanelComponent
		heading={quiz.state === QuizState.AboutToStart
			? m.getting_ready()
			: m.puzzle_heading({ number: puzzleNumber })}
		headingTestId="puzzle-heading"
		{labelSnippet}
	>
		<div class="text-center text-4xl md:text-5xl">
			<div
				class="mb-4 min-h-[1em]"
				data-testid="puzzle-expression"
				aria-live="assertive"
				aria-atomic="true"
			>
				{#if quiz.state === QuizState.AboutToStart}
					<TimeoutComponent
						seconds={AppSettings.separatorPageDuration}
						customDisplayWords={[
							m.countdown_go(),
							m.countdown_set(),
							m.countdown_ready()
						]}
						fadeOnSecondChange={true}
						onFinished={startQuiz}
					/>
				{:else}
					<span class="tabular-nums">
						{#each puzzle.parts as part, i}
							{#if puzzle.unknownPartIndex === i}
								<span
									class="transition-colors duration-200 {puzzle.isCorrect ===
									false
										? 'text-red-600 dark:text-red-400'
										: 'text-sky-700 dark:text-sky-300'}"
									>{part.userDefinedValue === undefined
										? '?'
										: Object.is(part.userDefinedValue, -0)
											? '-'
											: part.userDefinedValue}{#if puzzle.isCorrect === false}<span
											class="sr-only">, {m.label_incorrect()}</span
										>{/if}</span
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
					</span>
				{/if}
			</div>
			<div
				class="flex min-h-10 items-center justify-between text-sm md:min-h-11"
			>
				<div
					class="flex-1 text-left text-lg {quizAlmostFinished
						? 'font-semibold text-amber-700 dark:text-amber-300'
						: 'text-stone-900 dark:text-stone-100'}"
					aria-live="polite"
					aria-atomic="true"
				>
					{#if quiz.state === QuizState.Started && !isUnlimited}
						<TimeoutComponent
							{seconds}
							timerState={quizTimeoutState}
							onSecondChange={(s) => (quizSecondsLeft = s)}
							onFinished={onQuizTimeout}
							showMinutes={true}
						/>
					{/if}
				</div>
				<div>
					{#if quiz.state === QuizState.Started && quiz.showPuzzleProgressBar}
						<div
							in:fade={{ duration: AppSettings.transitionDuration.duration }}
						>
							<TimeoutComponent
								timerState={progressBarState}
								showProgressBar={true}
								seconds={AppSettings.regneflytThresholdSeconds}
							/>
						</div>
					{/if}
				</div>
				<div
					class="flex-1 text-right text-lg text-stone-700 dark:text-stone-300"
				>
					{#if isUnlimited || !AppSettings.isProduction}
						<ButtonComponent
							size="small"
							color="blue"
							title={m.cancel_complete_quiz()}
							testId="btn-complete-quiz"
							onclick={() => completeDialog.open()}
							>{m.button_finish()}</ButtonComponent
						>
					{/if}
				</div>
			</div>
		</div>
	</PanelComponent>
	<NumpadComponent
		disabled={inputLocked || puzzle.isCorrect === false}
		disabledNext={displayError}
		nextButtonColor={displayError ? 'red' : 'green'}
		bind:value={puzzle.parts[puzzle.unknownPartIndex].userDefinedValue}
		onCompletePuzzle={submitAnswer}
	/>
</form>

<DialogComponent
	bind:this={quitDialog}
	heading={m.cancel_confirm()}
	headingTestId="quit-dialog-heading"
	confirmColor="red"
	onConfirm={onAbortQuiz}
	confirmTestId="btn-cancel-yes"
	dismissTestId="btn-cancel-no"
>
	<p
		class="mb-6 text-lg text-stone-700 dark:text-stone-300"
		data-testid="quit-confirm-message"
	>
		{m.quit_confirm_message()}
	</p>
</DialogComponent>

<DialogComponent
	bind:this={completeDialog}
	heading={m.complete_confirm()}
	headingTestId="complete-dialog-heading"
	confirmColor="green"
	onConfirm={onCompleteQuiz}
	confirmTestId="btn-complete-yes"
	dismissTestId="btn-complete-no"
>
	<p
		class="mb-6 text-lg text-stone-700 dark:text-stone-300"
		data-testid="complete-confirm-message"
	>
		{m.complete_confirm_message()}
	</p>
</DialogComponent>
