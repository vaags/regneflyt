<script lang="ts">
	import { onDestroy, tick, untrack } from 'svelte'
	import { fade } from 'svelte/transition'
	import {
		button_finish,
		cancel_undo,
		countdown_go,
		countdown_ready,
		countdown_set,
		getting_ready,
		alert_enter_answer,
		label_answer,
		label_incorrect,
		label_stars,
		puzzle_heading,
		sr_puzzle_input,
		sr_time_almost_up
	} from '$lib/paraglide/messages.js'
	import TweenedValueComponent from '$lib/components/widgets/TweenedValueComponent.svelte'
	import TimeoutComponent from '$lib/components/widgets/TimeoutComponent.svelte'
	import { getPuzzle } from '$lib/helpers/puzzleHelper'
	import {
		hasMissingPuzzleInput,
		shouldResumeQuizTimerAfterTween,
		trimRecentPuzzleHistory
	} from '$lib/helpers/quiz/puzzleViewHelper'
	import PanelComponent from '$lib/components/widgets/PanelComponent.svelte'
	import type { Quiz } from '$lib/models/Quiz'
	import type { Puzzle } from '$lib/models/Puzzle'
	import { TimerState } from '$lib/constants/TimerState'
	import { AppSettings } from '$lib/constants/AppSettings'
	import { getOperatorSign } from '$lib/constants/Operator'
	import CompleteQuizDialogComponent from '$lib/components/dialogs/CompleteQuizDialogComponent.svelte'
	import ButtonComponent from '$lib/components/widgets/ButtonComponent.svelte'
	import CloseButtonComponent from '$lib/components/widgets/CloseButtonComponent.svelte'
	import StarComponent from '$lib/components/icons/StarComponent.svelte'
	import { QuizState } from '$lib/constants/QuizState'
	import { applySkillUpdate } from '$lib/helpers/adaptiveHelper'
	import { createRng } from '$lib/helpers/rng'
	import { getStickyGlobalNavContext } from '$lib/contexts/stickyGlobalNavContext'
	import type { DialogHandle } from '$lib/models/DialogHandle'
	import { dismissToast, showToast } from '$lib/stores'

	let {
		quiz,
		seconds,
		onStartQuiz = () => {},
		onAbortQuiz = () => {},
		onCompleteQuiz = () => {},
		onAddPuzzle = () => {},
		onQuizTimeout = () => {}
	}: {
		quiz: Quiz
		seconds: number
		onStartQuiz?: () => void
		onAbortQuiz?: () => void
		onCompleteQuiz?: () => void
		onAddPuzzle?: (puzzle: Puzzle) => void
		onQuizTimeout?: () => void
	} = $props()
	const initialSeconds = untrack(() => seconds)
	let completeDialog = $state<DialogHandle | undefined>(undefined)
	const isUnlimited = initialSeconds === 0
	const maxPuzzleAnswerDigits = String(
		AppSettings.maxPuzzleAnswerMagnitude
	).length
	const puzzleAnswerPattern = new RegExp(`^-?\\d{1,${maxPuzzleAnswerDigits}}$`)

	let quizSecondsLeft = $state(initialSeconds)
	let puzzleNumber = $state(0)
	let starCount = $state(0)
	let validationError = $state(false)
	let inputLocked = $state(false)
	let startTime: number
	let progressBarState: TimerState = $state(TimerState.Initialized)
	let quizTimeoutState: TimerState = $state(TimerState.Initialized)

	const recentPuzzleHistorySize = 5
	let recentPuzzles: Puzzle[] = []
	let consecutiveCorrect = 0
	const { rng } = createRng(untrack(() => quiz.seed))
	let puzzle = $state(generatePuzzle())
	const stickyGlobalNavContext = getStickyGlobalNavContext()
	const answerValidationMessageId = 'puzzle-answer-validation'
	let answerValidationToastId: number | undefined
	let answerInput = $state<HTMLInputElement | undefined>(undefined)
	let answerFocusPending = $state(false)
	let numpadNextFocusPending = $state(false)
	let hasPendingNegativeAnswer = $state(false)
	let initialAnswerFocusTimeout: ReturnType<typeof setTimeout> | undefined
	let countdownComplete = $state(
		untrack(() => quiz.state === QuizState.Started)
	)

	const almostFinishedThresholdSeconds = 5

	let quizAlmostFinished = $derived(
		!isUnlimited && quizSecondsLeft <= almostFinishedThresholdSeconds
	)

	// Announced once when the threshold is crossed, so the ticking timer itself
	// stays silent for screen readers.
	let quizCountdownAnnouncement = $derived(
		quizAlmostFinished ? sr_time_almost_up() : ''
	)

	let missingUserInput = $derived(hasMissingPuzzleInput(puzzle))

	let displayError = $derived(missingUserInput && validationError)

	let puzzleReady = $derived(countdownComplete)

	let puzzleExpression = $derived.by(() => {
		const parts = puzzle.parts
		const sign = getOperatorSign(puzzle.operator)
		const values = parts.map((p, i) =>
			i === puzzle.unknownPartIndex ? '?' : String(p.generatedValue)
		)
		return `${values[0]}${sign}${values[1]}=${values[2]}`
	})

	// --- Puzzle lifecycle ---

	function setPuzzleUserDefinedValue(value: number | undefined) {
		if (Object.is(value, -0)) {
			hasPendingNegativeAnswer = true
			puzzle.parts[puzzle.unknownPartIndex].userDefinedValue = undefined
			return
		}

		hasPendingNegativeAnswer = false
		puzzle.parts[puzzle.unknownPartIndex].userDefinedValue = value
		if (hasMissingPuzzleInput(puzzle)) return

		validationError = false
		dismissAnswerValidationToast()
	}

	function getAnswerInputValue() {
		const value = puzzle.parts[puzzle.unknownPartIndex].userDefinedValue
		if (value === undefined) return ''
		return Object.is(value, -0) ? '-' : String(value)
	}

	function handleAnswerInput(event: Event) {
		if (!(event.currentTarget instanceof HTMLInputElement)) return
		const input = event.currentTarget
		const nextValue = input.value

		if (
			input.validity.badInput ||
			(nextValue !== '' && !puzzleAnswerPattern.test(nextValue)) ||
			(nextValue !== '' &&
				Math.abs(Number(nextValue)) > AppSettings.maxPuzzleAnswerMagnitude)
		) {
			input.value = getAnswerInputValue()
			return
		}

		if (nextValue === '') {
			setPuzzleUserDefinedValue(undefined)
			return
		}

		setPuzzleUserDefinedValue(
			hasPendingNegativeAnswer ? Number(nextValue) * -1 : Number(nextValue)
		)
	}

	function handleAnswerKeyDown(event: KeyboardEvent) {
		if (event.isComposing) return
		if (event.key === '-') {
			event.preventDefault()
			const value = puzzle.parts[puzzle.unknownPartIndex].userDefinedValue
			setPuzzleUserDefinedValue(
				value === undefined ? -0 : value === 0 ? -0 : value * -1
			)
			return
		}
		if (event.key !== 'Enter') return

		event.preventDefault()
		submitAnswer()
	}

	function focusAnswerInputIfQuizOwnsFocus() {
		const activeElement = document.activeElement
		const mainContent = document.getElementById('main-content')
		if (
			activeElement !== null &&
			activeElement !== document.body &&
			activeElement !== document.documentElement &&
			activeElement !== mainContent
		)
			return

		answerInput?.focus({ preventScroll: true })
	}

	function dismissAnswerValidationToast() {
		if (answerValidationToastId === undefined) return
		dismissToast(answerValidationToastId)
		answerValidationToastId = undefined
	}

	function generatePuzzle() {
		puzzleNumber++

		const puzzle = getPuzzle(rng, quiz, recentPuzzles)

		recentPuzzles = trimRecentPuzzleHistory(
			recentPuzzles,
			puzzle,
			recentPuzzleHistorySize
		)

		// First puzzle: timers don't exist yet — startQuiz() handles the deferral.
		// Subsequent puzzles: defer timers while the tween animation plays.
		if (puzzleNumber > 1) deferTimersForTween()

		return puzzle
	}

	function startQuiz() {
		puzzle.parts[puzzle.unknownPartIndex].userDefinedValue = undefined
		hasPendingNegativeAnswer = false
		answerFocusPending = true
		onStartQuiz()
		countdownComplete = true
		focusInitialAnswerInput()

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

	function focusInitialAnswerInput() {
		clearTimeout(initialAnswerFocusTimeout)
		initialAnswerFocusTimeout = setTimeout(() => {
			answerInput?.focus({ preventScroll: true })
		}, 100)
	}

	function submitAnswer(completedByKeyboard = false) {
		if (inputLocked || puzzle.isCorrect !== undefined) return
		if (missingUserInput) {
			validationError = true
			answerValidationToastId = showToast(alert_enter_answer(), {
				variant: 'error',
				testId: 'puzzle-answer-validation-toast',
				autoDismissMs: null
			})
			return
		}
		validationError = false
		dismissAnswerValidationToast()
		void completePuzzle(completedByKeyboard)
	}

	async function completePuzzle(completedByKeyboard = false) {
		const shouldRestoreAnswerFocus =
			!completedByKeyboard && document.activeElement === answerInput
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
			if (puzzle.duration <= AppSettings.regneflytThresholdSeconds) starCount++
		} else {
			consecutiveCorrect = 0
		}

		applySkillUpdate(
			quiz.adaptiveSkillByOperator,
			puzzle.operator,
			puzzle.parts,
			Boolean(puzzle.isCorrect),
			puzzle.duration,
			consecutiveCorrect
		)

		onAddPuzzle({ ...puzzle })

		if (!puzzle.isCorrect) {
			await new Promise((r) =>
				setTimeout(r, AppSettings.correctionWrongDuration)
			)
		}

		answerFocusPending = shouldRestoreAnswerFocus
		numpadNextFocusPending = completedByKeyboard
		hasPendingNegativeAnswer = false
		inputLocked = false
		puzzle = generatePuzzle()
	}

	// --- Timer management ---

	/** Pause progress bar during tween. Resume quiz timer only if it was stopped. */
	function deferTimersForTween() {
		progressBarState = TimerState.Stopped

		if (!isUnlimited) {
			if (shouldResumeQuizTimerAfterTween(quizTimeoutState)) {
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

	function onDevCompleteShortcut(e: KeyboardEvent) {
		if (
			AppSettings.isProduction ||
			quiz.state !== QuizState.Started ||
			inputLocked
		)
			return
		if (e.defaultPrevented || e.repeat) return

		const isShortcutPressed =
			(e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'Enter'

		if (!isShortcutPressed) return

		e.preventDefault()
		completeDialog?.open()
	}

	$effect(() => {
		if (!stickyGlobalNavContext) return

		return stickyGlobalNavContext.registerQuizControls({
			value: puzzle.parts[puzzle.unknownPartIndex].userDefinedValue,
			disabled: inputLocked || puzzle.isCorrect === false,
			disabledNext: displayError,
			nextButtonColor: displayError ? 'red' : 'green',
			ariaDescribedBy: displayError ? answerValidationMessageId : undefined,
			onValueChange: setPuzzleUserDefinedValue,
			onCompletePuzzle: submitAnswer
		})
	})

	$effect(() => {
		if (!answerFocusPending || !puzzleReady || !answerInput) return

		answerFocusPending = false
		focusAnswerInputIfQuizOwnsFocus()
	})

	$effect(() => {
		if (!numpadNextFocusPending || !puzzleReady || inputLocked) return

		numpadNextFocusPending = false
		void tick().then(() => {
			document
				.querySelector<HTMLElement>('[data-testid="numpad-next"]')
				?.focus({
					preventScroll: true
				})
		})
	})

	onDestroy(() => {
		clearTimeout(initialAnswerFocusTimeout)
		dismissAnswerValidationToast()
	})
</script>

<svelte:window onkeydown={onDevCompleteShortcut} />

<form
	class="flex flex-1 flex-col justify-end"
	autocomplete="off"
	data-puzzle-state={puzzleReady ? 'ready' : 'countdown'}
	data-puzzle-number={puzzleNumber}
	data-puzzle-expression={puzzleReady ? puzzleExpression : undefined}
	aria-label={sr_puzzle_input({ number: puzzleNumber })}
	novalidate
	onsubmit={(event) => {
		event.preventDefault()
		submitAnswer()
	}}
>
	{#snippet labelSnippet()}
		<div class="-mt-5 -mr-5">
			<CloseButtonComponent
				onclick={onAbortQuiz}
				ariaLabel={cancel_undo()}
				testId="btn-cancel"
			/>
		</div>
	{/snippet}
	<PanelComponent
		heading={!puzzleReady
			? getting_ready()
			: puzzle_heading({ number: puzzleNumber })}
		headingTestId="puzzle-heading"
		collapsible={false}
		{labelSnippet}
	>
		<div class="text-center text-4xl md:text-5xl">
			<div
				class="sr-only"
				data-testid="quiz-countdown-announcer"
				aria-live="polite"
				aria-atomic="true"
			>
				{quizCountdownAnnouncement}
			</div>
			<!-- Separate from the atomic expression region so corrective feedback is
			     announced on its own instead of behind a full re-read. -->
			<div
				class="sr-only"
				data-testid="puzzle-incorrect-announcer"
				aria-live="polite"
			>
				{puzzle.isCorrect === false ? label_incorrect() : ''}
			</div>
			<div
				class="sr-only"
				data-testid="puzzle-expression-announcer"
				aria-live="polite"
				aria-atomic="true"
			>
				{puzzleReady ? puzzleExpression : ''}
			</div>
			<div class="relative mb-2.5 md:mb-4" data-testid="puzzle-expression">
				<span class="tabular-nums" class:invisible={!puzzleReady}>
					{#each puzzle.parts as part, i (i)}
						{#if puzzle.unknownPartIndex === i}
							<label for="puzzle-answer" class="sr-only">{label_answer()}</label
							>
							<input
								id="puzzle-answer"
								bind:this={answerInput}
								type="number"
								min={-AppSettings.maxPuzzleAnswerMagnitude}
								max={AppSettings.maxPuzzleAnswerMagnitude}
								step="1"
								inputmode="none"
								autocomplete="off"
								autocapitalize="none"
								autocorrect="off"
								spellcheck="false"
								aria-invalid={displayError ? 'true' : undefined}
								aria-describedby={displayError
									? answerValidationMessageId
									: undefined}
								disabled={!puzzleReady}
								readonly={inputLocked || puzzle.isCorrect === false}
								value={getAnswerInputValue()}
								oninput={handleAnswerInput}
								onkeydown={handleAnswerKeyDown}
								class="puzzle-answer-input inline-block min-h-11 w-24 rounded-md border px-2 py-1 text-center text-4xl leading-none transition-[color,background-color,border-color,outline-color,box-shadow] duration-200 placeholder:text-sky-700 placeholder:opacity-100 md:w-28 md:text-5xl dark:placeholder:text-sky-300 {hasPendingNegativeAnswer
									? ''
									: 'focus:placeholder:text-transparent'} {puzzle.isCorrect ===
								false
									? 'focus-ring-control-error text-red-900 dark:text-red-300'
									: 'text-sky-700 dark:text-sky-300'}"
								data-testid="puzzle-answer-value"
								placeholder={hasPendingNegativeAnswer ? '-' : '?'}
							/>
						{:else}
							<TweenedValueComponent
								value={part.generatedValue}
								enabled={puzzleReady}
							/>
						{/if}
						{#if i === 0}
							<span class="mr-2">
								{getOperatorSign(puzzle.operator)}
							</span>
						{:else if i === 1}<span class="mr-2">=</span>{/if}
					{/each}
				</span>
				{#if !puzzleReady}
					<div class="absolute inset-0 flex items-center justify-center">
						<TimeoutComponent
							seconds={AppSettings.separatorPageDuration}
							customDisplayWords={[
								countdown_go(),
								countdown_set(),
								countdown_ready()
							]}
							fadeOnSecondChange={true}
							onFinished={startQuiz}
						/>
					</div>
				{/if}
			</div>
			<div
				class="flex min-h-10 items-center justify-between text-sm md:min-h-11"
			>
				<div
					class="flex flex-1 items-center gap-3 text-left"
					class:min-h-11={isUnlimited}
				>
					{#if quiz.state === QuizState.Started && !isUnlimited}
						<div
							class="text-lg {quizAlmostFinished
								? 'font-semibold text-amber-900 dark:text-amber-300'
								: 'text-stone-900 dark:text-stone-100'}"
							data-testid="quiz-timer"
						>
							<TimeoutComponent
								{seconds}
								timerState={quizTimeoutState}
								onSecondChange={(s) => (quizSecondsLeft = s)}
								onFinished={onQuizTimeout}
								showMinutes={true}
							/>
						</div>
					{:else if quiz.state === QuizState.Started && isUnlimited}
						<ButtonComponent
							size="small"
							color="blue"
							testId="btn-complete-quiz"
							onclick={() => completeDialog?.open()}
							>{button_finish()}</ButtonComponent
						>
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
				<!-- Deliberately not a live region: a star lands on most puzzles, and
				     narrating the running total would queue ahead of the next puzzle.
				     The total is announced once on the results screen. -->
				<div
					class="flex flex-1 items-center justify-end gap-3 text-right text-lg text-stone-700 dark:text-stone-200"
					data-testid="quiz-star-region"
				>
					{#if starCount > 0}
						<div class="flex items-center gap-1">
							<StarComponent label={label_stars()} />
							<span>× {starCount}</span>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</PanelComponent>
	<div
		id={answerValidationMessageId}
		class="sr-only"
		data-testid="puzzle-answer-validation"
	>
		{displayError ? alert_enter_answer() : ''}
	</div>
</form>

<CompleteQuizDialogComponent
	bind:this={completeDialog}
	onConfirm={onCompleteQuiz}
/>
