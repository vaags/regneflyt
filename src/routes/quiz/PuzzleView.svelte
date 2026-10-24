<script lang="ts">
	import { onDestroy, untrack } from 'svelte'
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
	} from '#lib/paraglide/messages.js'
	import TweenedValueComponent from '#lib/components/widgets/TweenedValueComponent.svelte'
	import TimeoutComponent from '#lib/components/widgets/TimeoutComponent.svelte'
	import { getPuzzle } from '#lib/domain/puzzle-generation/puzzleGenerator.ts'
	import {
		hasMissingPuzzleInput,
		trimRecentPuzzleHistory
	} from '#lib/helpers/quiz/puzzleViewHelper.ts'
	import { createPuzzleLifecycle } from '#lib/helpers/quiz/puzzleLifecycleHelper.ts'
	import PanelComponent from '#lib/components/widgets/PanelComponent.svelte'
	import type { Quiz } from '#lib/domain/quiz/quiz.ts'
	import type { Puzzle } from '#lib/domain/puzzle-generation/puzzle.ts'
	import { AppSettings } from '#lib/constants/AppSettings.ts'
	import { getOperatorSign } from '#lib/domain/arithmetic/operator.ts'
	import CompleteQuizDialogComponent from '#lib/components/dialogs/CompleteQuizDialogComponent.svelte'
	import ButtonComponent from '#lib/components/widgets/ButtonComponent.svelte'
	import CloseButtonComponent from '#lib/components/widgets/CloseButtonComponent.svelte'
	import StarComponent from '#lib/components/icons/StarComponent.svelte'
	import { QuizState } from '#lib/domain/quiz/quizState.ts'
	import { completePuzzleAttempt } from '#lib/domain/quiz/puzzleAttempt.ts'
	import { createRng } from '#lib/domain/puzzle-generation/random.ts'
	import { getStickyGlobalNavContext } from '#lib/contexts/stickyGlobalNavContext.ts'
	import type { DialogHandle } from '#lib/models/DialogHandle.ts'
	import { dismissToast, showToast } from '#lib/stores.ts'

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

	const recentPuzzleHistorySize = 5
	let recentPuzzles: Puzzle[] = []
	let consecutiveCorrect = 0
	let restoreAnswerFocusOnNextPuzzle = false
	const { rng } = createRng(untrack(() => quiz.seed))
	let puzzle = $state(generatePuzzle())
	const lifecycle = createPuzzleLifecycle({
		startsAnswering: untrack(() => quiz.state === QuizState.Started),
		isUnlimited,
		transitionMs: AppSettings.transitionDuration.duration,
		feedbackMs: AppSettings.correctionWrongDuration,
		onNextPuzzle: showNextPuzzle
	})
	let lifecycleState = $state(lifecycle.getSnapshot())
	const unsubscribeLifecycle = lifecycle.subscribe((snapshot) => {
		lifecycleState = snapshot
	})
	const stickyGlobalNavContext = getStickyGlobalNavContext()
	const answerValidationMessageId = 'puzzle-answer-validation'
	let answerValidationToastId: number | undefined
	let answerInput = $state<HTMLInputElement | undefined>(undefined)
	let answerFocusPending = $state(false)
	let hasPendingNegativeAnswer = $state(false)
	let initialAnswerFocusTimeout: ReturnType<typeof setTimeout> | undefined

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

	let puzzleReady = $derived(lifecycleState.phase !== 'countdown')
	let answerReady = $derived(lifecycleState.phase === 'answering')
	let attemptInFlight = $derived(
		lifecycleState.phase === 'feedback' || lifecycleState.phase === 'ended'
	)

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
		if (event.isComposing || !answerReady) return
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

		return puzzle
	}

	function showNextPuzzle() {
		answerFocusPending = restoreAnswerFocusOnNextPuzzle
		hasPendingNegativeAnswer = false
		puzzle = generatePuzzle()
	}

	function startQuiz() {
		if (!lifecycle.start()) return
		puzzle.parts[puzzle.unknownPartIndex].userDefinedValue = undefined
		hasPendingNegativeAnswer = false
		answerFocusPending = true
		onStartQuiz()
		focusInitialAnswerInput()
	}

	function endQuiz(onEnded: () => void) {
		lifecycle.end()
		onEnded()
	}

	function focusInitialAnswerInput() {
		clearTimeout(initialAnswerFocusTimeout)
		initialAnswerFocusTimeout = setTimeout(focusAnswerInputIfQuizOwnsFocus, 100)
	}

	function submitAnswer(completedByKeyboard = false) {
		if (!answerReady || puzzle.isCorrect !== undefined) return
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
		restoreAnswerFocusOnNextPuzzle =
			!completedByKeyboard && document.activeElement === answerInput
		lifecycle.submitAttempt(completePuzzle)
	}

	function completePuzzle(durationSeconds: number): boolean {
		const completedAttempt = completePuzzleAttempt({
			puzzle,
			skillByOperator: quiz.skillByOperator,
			durationSeconds,
			consecutiveCorrect
		})
		puzzle = completedAttempt.puzzle
		consecutiveCorrect = completedAttempt.consecutiveCorrect

		const isCorrect = puzzle.isCorrect === true
		if (isCorrect && completedAttempt.awardedStar) starCount++

		onAddPuzzle({ ...puzzle })
		return isCorrect
	}

	function onDevCompleteShortcut(e: KeyboardEvent) {
		if (
			AppSettings.isProduction ||
			quiz.state !== QuizState.Started ||
			attemptInFlight
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
			disabled: !answerReady || puzzle.isCorrect === false,
			disabledNext: displayError,
			nextButtonColor: displayError ? 'red' : 'green',
			ariaDescribedBy: displayError ? answerValidationMessageId : undefined,
			onValueChange: setPuzzleUserDefinedValue,
			onCompletePuzzle: submitAnswer
		})
	})

	$effect(() => {
		if (!answerFocusPending || !answerReady || !answerInput) return

		answerFocusPending = false
		focusAnswerInputIfQuizOwnsFocus()
	})

	onDestroy(() => {
		clearTimeout(initialAnswerFocusTimeout)
		unsubscribeLifecycle()
		lifecycle.end()
		dismissAnswerValidationToast()
	})
</script>

<svelte:window onkeydown={onDevCompleteShortcut} />

<form
	class="puzzle-view"
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
		<div class="close">
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
		<div class="content">
			<div
				class="visually-hidden"
				data-testid="quiz-countdown-announcer"
				aria-live="polite"
				aria-atomic="true"
			>
				{quizCountdownAnnouncement}
			</div>
			<!-- Separate from the atomic expression region so corrective feedback is
			     announced on its own instead of behind a full re-read. -->
			<div
				class="visually-hidden"
				data-testid="puzzle-incorrect-announcer"
				aria-live="polite"
			>
				{puzzle.isCorrect === false ? label_incorrect() : ''}
			</div>
			<div
				class="visually-hidden"
				data-testid="puzzle-expression-announcer"
				aria-live="polite"
				aria-atomic="true"
			>
				{puzzleReady ? puzzleExpression : ''}
			</div>
			<div class="expression" data-testid="puzzle-expression">
				<span class="equation" data-hidden={!puzzleReady || undefined}>
					{#each puzzle.parts as part, i (i)}
						{#if puzzle.unknownPartIndex === i}
							<label for="puzzle-answer" class="visually-hidden"
								>{label_answer()}</label
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
								readonly={!answerReady || puzzle.isCorrect === false}
								value={getAnswerInputValue()}
								oninput={handleAnswerInput}
								onkeydown={handleAnswerKeyDown}
								class="answer-input"
								data-error={puzzle.isCorrect === false || undefined}
								data-focus-danger={puzzle.isCorrect === false || undefined}
								data-preserve-placeholder={hasPendingNegativeAnswer ||
									undefined}
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
							<span class="operator">
								{getOperatorSign(puzzle.operator)}
							</span>
						{:else if i === 1}<span class="operator">=</span>{/if}
					{/each}
				</span>
				{#if !puzzleReady}
					<div class="countdown">
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
			<div class="status-row">
				<div class="timer-region" data-unlimited={isUnlimited || undefined}>
					{#if quiz.state === QuizState.Started && !isUnlimited}
						<div
							class="timer"
							data-almost-finished={quizAlmostFinished || undefined}
							data-testid="quiz-timer"
						>
							<TimeoutComponent
								{seconds}
								timerState={lifecycleState.quizTimeoutState}
								onSecondChange={(s) => (quizSecondsLeft = s)}
								onFinished={() => endQuiz(onQuizTimeout)}
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
								timerState={lifecycleState.progressBarState}
								showProgressBar={true}
								seconds={AppSettings.regneflytThresholdSeconds}
							/>
						</div>
					{/if}
				</div>
				<!-- Deliberately not a live region: a star lands on most puzzles, and
				     narrating the running total would queue ahead of the next puzzle.
				     The total is announced once on the results screen. -->
				<div class="stars" data-testid="quiz-star-region">
					{#if starCount > 0}
						<div class="star-count">
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
		class="visually-hidden"
		data-testid="puzzle-answer-validation"
	>
		{displayError ? alert_enter_answer() : ''}
	</div>
</form>

<CompleteQuizDialogComponent
	bind:this={completeDialog}
	onConfirm={() => endQuiz(onCompleteQuiz)}
/>

<style>
	.puzzle-view {
		display: flex;
		flex: 1;
		flex-direction: column;
		justify-content: flex-end;

		& .close {
			margin-block-start: -1.25rem;
			margin-inline-end: -1.25rem;
		}

		& .content {
			font-size: 2.25rem;
			text-align: center;
		}

		& .expression {
			position: relative;
			margin-block-end: 0.625rem;
		}

		& .equation {
			font-variant-numeric: tabular-nums;

			&[data-hidden='true'] {
				visibility: hidden;
			}
		}

		& .operator {
			margin-inline-end: 0.5rem;
		}

		& .countdown {
			position: absolute;
			inset: 0;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		& .status-row {
			display: flex;
			align-items: center;
			justify-content: space-between;
			min-block-size: 2.5rem;
			font-size: 0.875rem;
		}

		& .timer-region,
		& .stars {
			display: flex;
			align-items: center;
			flex: 1;
			gap: 0.75rem;
		}

		& .timer-region {
			text-align: start;

			&[data-unlimited='true'] {
				min-block-size: var(--target-minimum);
			}
		}

		& .timer {
			color: var(--color-text-primary);
			font-size: 1.125rem;

			&[data-almost-finished='true'] {
				color: var(--color-warning-900);
				font-weight: 600;
			}
		}

		& .stars {
			justify-content: flex-end;
			color: var(--color-text-secondary);
			font-size: 1.125rem;
			text-align: end;
		}

		& .star-count {
			display: flex;
			align-items: center;
			gap: 0.25rem;
		}

		& .answer-input {
			display: inline-block;
			inline-size: 6rem;
			min-block-size: var(--target-minimum);
			padding: 0.25rem 0.5rem;
			appearance: textfield;
			border-radius: var(--radius-control);
			color: var(--color-primary-700);
			font-size: 2.25rem;
			line-height: 1;
			text-align: center;
			transition:
				color 200ms,
				background-color 200ms,
				border-color 200ms,
				outline-color 200ms,
				box-shadow 200ms;

			&::-webkit-inner-spin-button,
			&::-webkit-outer-spin-button {
				margin: 0;
				appearance: none;
			}

			&::placeholder {
				color: var(--color-primary-700);
				opacity: 1;
			}

			&:not([data-preserve-placeholder='true']):focus::placeholder {
				color: transparent;
			}

			&[data-error='true'] {
				border-color: var(--color-danger-700);
				color: var(--color-danger-900);
			}
		}
	}

	:global(.dark) .puzzle-view {
		& .answer-input {
			color: var(--color-primary-300);

			&::placeholder {
				color: var(--color-primary-300);
			}

			&[data-error='true'] {
				border-color: var(--color-danger-300);
				color: var(--color-danger-300);
			}
		}

		& .timer[data-almost-finished='true'] {
			color: var(--color-warning-300);
		}
	}

	@media (min-width: 48rem) {
		.puzzle-view {
			& .content {
				font-size: 3rem;
			}

			& .expression {
				margin-block-end: 1rem;
			}

			& .answer-input {
				inline-size: 7rem;
				font-size: 3rem;
			}

			& .status-row {
				min-block-size: var(--target-minimum);
			}
		}
	}
</style>
