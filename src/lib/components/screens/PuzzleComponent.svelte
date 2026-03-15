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
	import CancelComponent from '../screens/CancelComponent.svelte'
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
	const initialSeconds = untrack(() => seconds)
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
		progressBarState = TimerState.Stopped
		const finishTime = Date.now()
		await tick()

		puzzle.isCorrect =
			puzzle.parts[puzzle.unknownPartIndex].userDefinedValue ===
			puzzle.parts[puzzle.unknownPartIndex].generatedValue
		puzzle.duration = (finishTime - startTime) / 1000

		if (puzzle.isCorrect) {
			consecutiveCorrect++
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
>
	{#snippet labelSnippet()}
		<div
			class="float-right text-lg {quizAlmostFinished
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
					</span>
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
								timerState={progressBarState}
								showProgressBar={true}
								seconds={AppSettings.regneflytThresholdSeconds}
							/>
						</div>
					{/if}
				</div>
				<div class="flex-1">
					<CancelComponent
						showCompleteButton={isUnlimited || !AppSettings.isProduction}
					/>
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
