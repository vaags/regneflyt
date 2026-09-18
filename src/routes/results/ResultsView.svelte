<script lang="ts">
	import type { Puzzle } from '#lib/domain/puzzle-generation/puzzle.ts'
	import { onDestroy, onMount, untrack } from 'svelte'
	import PanelComponent from '#lib/components/widgets/PanelComponent.svelte'
	import AlertComponent from '#lib/components/widgets/AlertComponent.svelte'
	import PuzzleResultExpression from '#lib/components/widgets/PuzzleResultExpression.svelte'
	import type { QuizStats } from '#lib/models/QuizStats.ts'
	import type { Quiz } from '#lib/domain/quiz/quiz.ts'
	import CheckmarkIconComponent from '#lib/components/icons/CheckmarkComponent.svelte'
	import CrossIconComponent from '#lib/components/icons/CrossComponent.svelte'
	import StarComponent from '#lib/components/icons/StarComponent.svelte'
	import {
		alert_no_completed,
		heading_puzzles,
		heading_results,
		heading_skill_level,
		label_correct,
		label_incorrect,
		label_of,
		label_regneflyt,
		label_seconds_unit,
		label_show_answer_key,
		label_stars,
		label_accuracy,
		sr_column_number,
		sr_column_puzzle,
		sr_column_result,
		sr_column_star,
		sr_column_time
	} from '#lib/paraglide/messages.js'
	import { getLocale } from '#lib/paraglide/runtime.js'
	import { getQuizTitle } from '#lib/helpers/quiz/quizHelper.ts'
	import { hasRegneflytStar } from '#lib/domain/quiz/quizScoring.ts'
	import { clampSkill } from '#lib/domain/skill-progression/skillUpdate.ts'
	import type { OperatorSkillMap } from '#lib/domain/skill-progression/skillModel.ts'
	import { Operator } from '#lib/domain/arithmetic/operator.ts'
	import { getOperatorLabel } from '#lib/integrations/paraglide/operatorLabels.ts'
	import SkillBarComponent from '#lib/components/widgets/SkillBarComponent.svelte'
	import { operatorSkills } from '#lib/stores.ts'
	import { getStickyGlobalNavContext } from '#lib/contexts/stickyGlobalNavContext.ts'
	import { formatPuzzleDurationSeconds } from '#lib/helpers/quiz/resultsViewHelper.ts'

	let {
		puzzleSet,
		quizStats,
		quiz,
		preQuizSkill,
		animateSkill = true,
		onGetReady = () => {}
	}: {
		puzzleSet: Puzzle[]
		quizStats: QuizStats
		quiz: Quiz
		preQuizSkill: OperatorSkillMap
		animateSkill?: boolean
		onGetReady?: (quiz: Quiz) => void
	} = $props()

	const initialAnimateSkill = untrack(() => animateSkill)
	const initialPuzzleSet = untrack(() => puzzleSet)
	const initialQuizStats = untrack(() => quizStats)
	const locale = getLocale()
	const stickyGlobalNavContext = getStickyGlobalNavContext()
	const skillAnimationStartDelayMs = 600
	const showDeltaDelayMs = 1300

	let showCorrectAnswer = $state(false)
	let showAnimatedTransition = $state(false)
	let showAnimatedSkillValue = $state(!initialAnimateSkill)
	let showDelta = $state(!initialAnimateSkill)
	const animationTimeouts: ReturnType<typeof setTimeout>[] = []

	const summaryTone = $derived(
		initialQuizStats.correctAnswerPercentage >= 80
			? 'positive'
			: initialQuizStats.correctAnswerPercentage >= 50
				? 'warning'
				: 'danger'
	)

	const activeOperators: Operator[] = [
		...new Set(initialPuzzleSet.map((p) => p.operator))
	].sort()
	const skillOperators = [
		Operator.Addition,
		Operator.Subtraction,
		Operator.Multiplication,
		Operator.Division
	]

	function getReady() {
		onGetReady({ ...quiz })
	}

	function scheduleAnimationUpdate(
		callback: () => void,
		delayMs: number
	): void {
		const timeout = setTimeout(() => {
			const timeoutIndex = animationTimeouts.indexOf(timeout)
			if (timeoutIndex !== -1) animationTimeouts.splice(timeoutIndex, 1)
			callback()
		}, delayMs)
		animationTimeouts.push(timeout)
	}

	onMount(() => {
		if (animateSkill) {
			// Timeline: wait, enable bar transition/value animation, then reveal delta text.
			scheduleAnimationUpdate(() => {
				showAnimatedTransition = true
				showAnimatedSkillValue = true
			}, skillAnimationStartDelayMs)
			scheduleAnimationUpdate(() => (showDelta = true), showDeltaDelayMs)
		}
	})

	onDestroy(() => {
		for (const timeout of animationTimeouts) clearTimeout(timeout)
		animationTimeouts.length = 0
	})

	$effect(() => {
		const unregister = stickyGlobalNavContext.registerStartActions({
			onStart: getReady
		})

		return unregister
	})
</script>

{#snippet puzzleResultCard(puzzle: Puzzle, index: number)}
	<li class="result-card">
		<span class="result-card__number">{index + 1}</span>
		<span class="result-card__puzzle">
			<PuzzleResultExpression {puzzle} {showCorrectAnswer} />
		</span>
		<span class="result-card__outcome">
			{#if puzzle.isCorrect}
				<CheckmarkIconComponent label={label_correct()} />
			{:else}
				<CrossIconComponent label={label_incorrect()} />
			{/if}
		</span>
		<span class="result-card__duration">
			{formatPuzzleDurationSeconds(puzzle.duration, locale)}
			<span class="result-card__unit">{label_seconds_unit()}</span>
		</span>
		<span class="result-card__star">
			{#if hasRegneflytStar(puzzle)}
				<StarComponent label={label_regneflyt()} />
			{/if}
		</span>
	</li>
{/snippet}

{#snippet puzzleResultRow(puzzle: Puzzle, index: number)}
	<tr>
		<td class="result-table__number">
			{index + 1}
		</td>
		<td class="result-table__puzzle">
			<PuzzleResultExpression
				{puzzle}
				{showCorrectAnswer}
				showIncorrectSubmittedValue={true}
			/>
		</td>
		<td class="result-table__cell">
			{#if puzzle.isCorrect}
				<CheckmarkIconComponent label={label_correct()} testId="icon-correct" />
			{:else}
				<CrossIconComponent label={label_incorrect()} testId="icon-incorrect" />
			{/if}
		</td>
		<td class="result-table__cell result-table__duration">
			{formatPuzzleDurationSeconds(puzzle.duration, locale)}
			<span class="result-table__unit">{label_seconds_unit()}</span>
		</td>
		<td class="result-table__cell">
			{#if hasRegneflytStar(puzzle)}
				<StarComponent label={label_regneflyt()} />
			{/if}
		</td>
	</tr>
{/snippet}
<div class="results-view">
	<PanelComponent
		heading={heading_results()}
		headingTestId="heading-results"
		label={getQuizTitle(quiz)}
		collapsible={false}
	>
		{#if puzzleSet?.length}
			<div
				class="results-summary"
				data-tone={summaryTone}
				data-testid="results-summary-card"
			>
				<div class="results-summary__content">
					<dl class="results-summary__stats">
						<dt class="results-summary__label">{label_accuracy()}</dt>
						<dd
							class="results-summary__percentage"
							data-testid="results-summary-percentage"
						>
							{quizStats.correctAnswerPercentage}%
						</dd>
						<dd class="results-summary__count">
							{quizStats.correctAnswerCount}
							{label_of()}
							{puzzleSet.length}
						</dd>
					</dl>
					<div class="results-summary__stars">
						<StarComponent label={label_stars()} />
						<span>{quizStats.starCount}</span>
					</div>
				</div>
			</div>
		{:else}
			<!-- An empty state, not a problem, so it must not interrupt. -->
			<AlertComponent color="yellow" announce={false}
				>{alert_no_completed()}</AlertComponent
			>
		{/if}
	</PanelComponent>

	<PanelComponent
		heading={heading_skill_level()}
		headingTestId="heading-results-skill"
		collapsible={false}
	>
		<div aria-live="polite" data-testid="results-skill-bars">
			{#each skillOperators as operator (operator)}
				{@const isActive = activeOperators.includes(operator)}
				{@const before = clampSkill(preQuizSkill[operator])}
				{@const after = clampSkill(quiz.skillByOperator[operator])}
				<SkillBarComponent
					label={getOperatorLabel(operator)}
					value={isActive
						? showAnimatedSkillValue
							? after
							: before
						: clampSkill(operatorSkills.current[operator] ?? 0)}
					delta={isActive ? Math.round(after - before) : undefined}
					showDelta={isActive ? showDelta : false}
					animated={isActive ? showAnimatedTransition : false}
					testId="skill-overall-operator-{operator}"
				/>
			{/each}
		</div>
	</PanelComponent>

	{#if puzzleSet?.length}
		<PanelComponent
			heading={heading_puzzles()}
			headingTestId="heading-puzzles"
			collapsible={false}
		>
			<div class="results-view__controls">
				{#if quizStats.correctAnswerPercentage < 100}
					<label class="results-view__answer-toggle">
						<input type="checkbox" bind:checked={showCorrectAnswer} />
						<span>{label_show_answer_key()}</span>
					</label>
				{/if}
			</div>
			<!-- Mobile card list (hidden on sm and above) -->
			<ul class="result-cards">
				{#each puzzleSet as puzzle, i (i)}
					{@render puzzleResultCard(puzzle, i)}
				{/each}
			</ul>
			<!-- Desktop table (hidden below sm) -->
			<table class="result-table">
				<thead>
					<tr class="result-table__header">
						<th
							scope="col"
							class="result-table__heading result-table__heading--number"
							>{sr_column_number()}</th
						>
						<th
							scope="col"
							class="result-table__heading result-table__heading--puzzle"
							>{sr_column_puzzle()}</th
						>
						<th scope="col" class="result-table__heading"
							>{sr_column_result()}</th
						>
						<th scope="col" class="result-table__heading">{sr_column_time()}</th
						>
						<th scope="col" class="result-table__heading">{sr_column_star()}</th
						>
					</tr>
				</thead>
				<tbody>
					{#each puzzleSet as puzzle, i (i)}
						{@render puzzleResultRow(puzzle, i)}
					{/each}
				</tbody>
			</table>
		</PanelComponent>
	{/if}
</div>

<style>
	.result-card {
		display: grid;
		grid-template-columns: 1.25rem minmax(0, 1fr) 1.5rem;
		align-items: center;
		gap: 0.25rem 0.5rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-panel);
		font-size: 1.125rem;
	}

	.result-card__number {
		grid-row: 1;
		inline-size: 1.25rem;
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	.result-card__puzzle {
		grid-column: 2;
		grid-row: 1;
		min-inline-size: 0;
	}

	.result-card__outcome,
	.result-card__star {
		grid-column: 3;
		display: flex;
		justify-content: center;
		inline-size: 1.75rem;
	}

	.result-card__outcome {
		grid-row: 1;
	}

	.result-card__duration {
		grid-column: 2;
		grid-row: 2;
		color: var(--color-text-muted);
		font-size: 1rem;
		font-variant-numeric: tabular-nums;
		text-align: start;
		white-space: nowrap;
	}

	.result-card__unit,
	.result-table__unit {
		font-size: 0.875rem;
	}

	.result-card__star {
		grid-row: 2;
	}

	.results-summary {
		padding: 1rem;
		border: 1px solid;
		border-radius: var(--radius-control);
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
	}

	.results-summary[data-tone='positive'] {
		border-color: var(--color-primary-500);
		background: var(--color-primary-100);
		color: var(--color-primary-900);
	}

	.results-summary[data-tone='warning'] {
		border-color: var(--color-warning-500);
		background: var(--color-warning-100);
		color: var(--color-warning-900);
	}

	.results-summary[data-tone='danger'] {
		border-color: var(--color-danger-500, #ef4444);
		background: var(--color-danger-100);
		color: var(--color-danger-900);
	}

	.results-summary__content {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.results-summary__stats {
		min-inline-size: 0;
	}

	.results-summary__label {
		font-size: 0.875rem;
		font-weight: 500;
	}

	.results-summary__percentage {
		font-size: 2.25rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.025em;
	}

	.results-summary__count {
		font-size: 1rem;
	}

	.results-summary__stars {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.75rem;
		border: 1px solid currentcolor;
		border-radius: var(--radius-control);
		font-size: 1.125rem;
		font-weight: 500;
	}

	.results-view__controls {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-block-end: 0.75rem;
	}

	.results-view__answer-toggle {
		display: inline-flex;
		align-items: center;
		min-block-size: var(--target-minimum);
		gap: 0.5rem;
		padding-block: 0.25rem;
		font-size: 1rem;
	}

	.result-cards {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding: 0;
		list-style: none;
	}

	.result-table {
		display: none;
		inline-size: 100%;
		border-collapse: collapse;
		font-size: 1.125rem;
	}

	.result-table__header {
		border-block-end: 1px solid var(--color-border-subtle);
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		letter-spacing: 0.025em;
		text-align: start;
		text-transform: uppercase;
	}

	.result-table__heading {
		padding: 0 0.5rem 0.5rem;
	}

	.result-table__heading--number {
		padding-inline-start: 0;
	}

	.result-table__heading--puzzle {
		padding-inline: 0.75rem;
	}

	.result-table__number,
	.result-table__puzzle,
	.result-table__cell {
		padding: 0.5rem;
		border-block-start: 1px solid var(--color-border-subtle);
	}

	.result-table__number {
		padding-inline-start: 0;
		color: var(--color-text-secondary);
	}

	.result-table__puzzle {
		padding-inline: 0.75rem;
		white-space: nowrap;
	}

	.result-table__duration {
		white-space: nowrap;
	}

	:global(.dark) .results-summary[data-tone='positive'] {
		background: var(--color-primary-900);
		color: var(--color-primary-100);
	}

	:global(.dark) .results-summary[data-tone='warning'] {
		background: var(--color-warning-900);
		color: var(--color-warning-100);
	}

	:global(.dark) .results-summary[data-tone='danger'] {
		background: var(--color-danger-900);
		color: var(--color-danger-100);
	}

	@media (min-width: 40rem) {
		.result-cards {
			display: none;
		}

		.result-table {
			display: table;
		}
	}

	@media (min-width: 48rem) {
		.result-table__heading,
		.result-table__cell {
			padding-inline: 0.75rem;
		}

		.result-table__heading--puzzle,
		.result-table__puzzle {
			padding-inline: 1rem;
		}
	}
</style>
