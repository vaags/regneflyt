<script lang="ts">
	import type { Puzzle } from '$lib/models/Puzzle'
	import { onMount, untrack } from 'svelte'
	import PanelComponent from '$lib/components/widgets/PanelComponent.svelte'
	import AlertComponent from '$lib/components/widgets/AlertComponent.svelte'
	import HiddenValueComponent from '$lib/components/widgets/HiddenValueComponent.svelte'
	import type { QuizStats } from '$lib/models/QuizStats'
	import { AppSettings } from '$lib/constants/AppSettings'
	import { getOperatorSign } from '$lib/constants/Operator'
	import type { Quiz } from '$lib/models/Quiz'
	import CheckmarkIconComponent from '$lib/components/icons/CheckmarkComponent.svelte'
	import CrossIconComponent from '$lib/components/icons/CrossComponent.svelte'
	import StarComponent from '$lib/components/icons/StarComponent.svelte'
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
	} from '$lib/paraglide/messages.js'
	import { getLocale } from '$lib/paraglide/runtime.js'
	import { getQuizTitle } from '$lib/helpers/quiz/quizHelper'
	import { clampSkill } from '$lib/helpers/adaptiveHelper'
	import type { AdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
	import { Operator, getOperatorLabel } from '$lib/constants/Operator'
	import SkillBarComponent from '$lib/components/widgets/SkillBarComponent.svelte'
	import { adaptiveSkills } from '$lib/stores'
	import {
		buildConceptPerformanceMap,
		getTopSystematicWeakness
	} from '$lib/helpers/errorPatternHelper'
	import { generateFeedbackMessage } from '$lib/helpers/feedbackHelper'
	import type { FeedbackMessage } from '$lib/helpers/feedbackHelper'
	import { tuplesToConceptStats } from '$lib/models/QuizStats'
	import { getStickyGlobalNavContext } from '$lib/contexts/stickyGlobalNavContext'

	let {
		puzzleSet,
		quizStats,
		quiz,
		preQuizSkill,
		animateSkill = true,
		onGetReady = () => {},
		onReplay = undefined
	}: {
		puzzleSet: Puzzle[]
		quizStats: QuizStats
		quiz: Quiz
		preQuizSkill: AdaptiveSkillMap
		animateSkill?: boolean
		onGetReady?: (quiz: Quiz) => void
		onReplay?: (() => void) | undefined
	} = $props()

	const initialAnimateSkill = untrack(() => animateSkill)
	const initialPuzzleSet = untrack(() => puzzleSet)
	const initialQuizStats = untrack(() => quizStats)
	const stickyGlobalNavContext = getStickyGlobalNavContext()

	let showCorrectAnswer = $state(false)
	let showAnimatedTransition = $state(false)
	let showAnimatedSkillValue = $state(!initialAnimateSkill)
	let showDelta = $state(!initialAnimateSkill)

	// alert-blue/yellow/red are visual utilities used directly here, not AlertComponent (which carries role="alert").
	const summaryColorClass = $derived(
		initialQuizStats.correctAnswerPercentage >= 80
			? 'alert-blue'
			: initialQuizStats.correctAnswerPercentage >= 50
				? 'alert-yellow'
				: 'alert-red'
	)

	const activeOperators = [
		...new Set(initialPuzzleSet.map((p) => p.operator))
	].sort() as Operator[]
	const skillOperators = [
		Operator.Addition,
		Operator.Subtraction,
		Operator.Multiplication,
		Operator.Division
	]
	const feedbackMessage: FeedbackMessage | null = initialPuzzleSet.length
		? generateFeedbackMessage(
				getTopSystematicWeakness(
					// Reuse concept stats from QuizStats when available; fall back to
					// local analysis so feedback still works for legacy stats payloads.
					initialQuizStats.conceptStats
						? tuplesToConceptStats(initialQuizStats.conceptStats)
						: buildConceptPerformanceMap(initialPuzzleSet)
				)
			)
		: null

	function getReady() {
		onGetReady({ ...quiz })
	}

	onMount(() => {
		if (animateSkill) {
			// Enable transition first, then update values so bars animate from before->after.
			setTimeout(() => {
				showAnimatedTransition = true
				showAnimatedSkillValue = true
			}, 600)
			setTimeout(() => (showDelta = true), 1300)
		}
	})

	$effect(() => {
		const unregister = stickyGlobalNavContext.registerStartActions({
			onStart: getReady,
			onReplay
		})

		return unregister
	})
</script>

{#snippet puzzleResultCard(puzzle: Puzzle, index: number)}
	<li
		class="grid grid-cols-[1.25rem_minmax(0,1fr)_1.5rem_3.5rem_1.5rem] items-center gap-x-2 rounded-lg border border-stone-200 px-3 py-2 text-lg dark:border-stone-700"
	>
		<span class="w-5 shrink-0 text-sm text-stone-500 dark:text-stone-400"
			>{index + 1}</span
		>
		<span class="min-w-0 truncate pr-2">
			{#each puzzle.parts as part, i (i)}
				{#if puzzle.unknownPartIndex === i}
					<HiddenValueComponent
						value={part.userDefinedValue}
						showHiddenValue={showCorrectAnswer}
						hiddenValue={part.generatedValue}
						color="red"
						strong={true}
					/>
				{:else}{part.generatedValue}{/if}
				{#if i === 0}
					<span class="mr-1">{getOperatorSign(puzzle.operator)}</span>
				{:else if i === 1}
					<span class="mr-1">=</span>
				{/if}
			{/each}
		</span>
		<span class="flex w-7 justify-center">
			{#if puzzle.isCorrect}
				<CheckmarkIconComponent label={label_correct()} />
			{:else}
				<CrossIconComponent label={label_incorrect()} />
			{/if}
		</span>
		<span
			class="text-right text-base whitespace-nowrap text-stone-600 tabular-nums dark:text-stone-400"
		>
			{(Math.round(puzzle.duration * 10) / 10).toLocaleString(getLocale())}
			<span class="text-sm">{label_seconds_unit()}</span>
		</span>
		<span class="flex w-7 shrink-0 justify-center">
			{#if puzzle.isCorrect && puzzle.duration <= AppSettings.regneflytThresholdSeconds}
				<StarComponent label={label_regneflyt()} />
			{/if}
		</span>
	</li>
{/snippet}

{#snippet puzzleResultRow(puzzle: Puzzle, index: number)}
	<tr>
		<td
			class="border-t border-stone-300 py-2 text-stone-800 dark:border-stone-700 dark:text-stone-200"
		>
			{index + 1}
		</td>
		<td
			class="border-t border-stone-300 px-3 py-2 whitespace-nowrap md:px-4 dark:border-stone-700"
		>
			{#each puzzle.parts as part, i (i)}
				{#if puzzle.unknownPartIndex === i}
					<HiddenValueComponent
						value={part.userDefinedValue}
						showHiddenValue={showCorrectAnswer}
						hiddenValue={part.generatedValue}
						color="red"
						strong={true}
					/>
					{#if showCorrectAnswer && !puzzle.isCorrect}
						<span class="text-red-800 dark:text-red-400"
							>({part.userDefinedValue})</span
						>
					{/if}
				{:else}{part.generatedValue}{/if}
				{#if i === 0}
					<span class="mr-1">
						{getOperatorSign(puzzle.operator)}
					</span>
				{:else if i === 1}
					<span class="mr-1">=</span>
				{/if}
			{/each}
		</td>
		<td
			class="border-t border-stone-300 px-2 py-2 md:px-3 dark:border-stone-700"
		>
			{#if puzzle.isCorrect}
				<CheckmarkIconComponent label={label_correct()} testId="icon-correct" />
			{:else}
				<CrossIconComponent label={label_incorrect()} testId="icon-incorrect" />
			{/if}
		</td>
		<td
			class="border-t border-stone-300 px-2 py-2 whitespace-nowrap md:px-3 dark:border-stone-700"
		>
			{(Math.round(puzzle.duration * 10) / 10).toLocaleString(getLocale())}
			<span class="text-sm">{label_seconds_unit()}</span>
		</td>
		<td
			class="border-t border-stone-300 px-2 py-2 md:px-3 dark:border-stone-700"
		>
			{#if puzzle.isCorrect && puzzle.duration <= AppSettings.regneflytThresholdSeconds}
				<StarComponent label={label_regneflyt()} />
			{/if}
		</td>
	</tr>
{/snippet}
<div>
	<PanelComponent
		heading={heading_results()}
		headingTestId="heading-results"
		label={getQuizTitle(quiz)}
		collapsible={false}
	>
		{#if puzzleSet?.length}
			<div
				class="{summaryColorClass} rounded-md p-4"
				data-testid="results-summary-card"
			>
				<div class="flex flex-wrap items-end justify-between gap-3">
					<dl class="min-w-0">
						<dt class="text-sm font-medium">{label_accuracy()}</dt>
						<dd
							class="text-4xl font-semibold tracking-tight tabular-nums"
							data-testid="results-summary-percentage"
						>
							{quizStats.correctAnswerPercentage}%
						</dd>
						<dd class="text-base">
							{quizStats.correctAnswerCount}
							{label_of()}
							{puzzleSet.length}
						</dd>
					</dl>
					<div
						class="inline-flex items-center gap-1 rounded-md border border-current px-3 py-1.5 text-lg font-medium"
					>
						<StarComponent label={label_stars()} />
						<span>{quizStats.starCount}</span>
					</div>
				</div>
			</div>
		{:else}
			<AlertComponent color="yellow">{alert_no_completed()}</AlertComponent>
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
				{@const after = clampSkill(quiz.adaptiveSkillByOperator[operator])}
				<SkillBarComponent
					label={getOperatorLabel(operator)}
					value={isActive
						? showAnimatedSkillValue
							? after
							: before
						: clampSkill(adaptiveSkills.current[operator] ?? 0)}
					delta={isActive ? Math.round(after - before) : undefined}
					showDelta={isActive ? showDelta : false}
					animated={isActive ? showAnimatedTransition : false}
					testId="skill-overall-operator-{operator}"
				/>
			{/each}
		</div>
	</PanelComponent>

	{#if puzzleSet?.length && feedbackMessage}
		<PanelComponent heading={feedbackMessage.title} collapsible={false}>
			<p>
				{feedbackMessage.concept} — {feedbackMessage.accuracy}.<br />
				{feedbackMessage.actionItem}
			</p>
		</PanelComponent>
	{/if}

	{#if puzzleSet?.length}
		<PanelComponent
			heading={heading_puzzles()}
			headingTestId="heading-puzzles"
			collapsible={false}
		>
			<div class="mb-3 flex flex-wrap items-center justify-end gap-3">
				{#if quizStats.correctAnswerPercentage < 100}
					<label class="inline-flex items-center text-base">
						<input
							type="checkbox"
							class="form-checkbox h-5 w-5 rounded text-sky-700"
							bind:checked={showCorrectAnswer}
						/>
						<span class="ml-2">{label_show_answer_key()}</span>
					</label>
				{/if}
			</div>
			<!-- Mobile card list (hidden on sm and above) -->
			<ul class="space-y-1.5 sm:hidden">
				{#each puzzleSet as puzzle, i (i)}
					{@render puzzleResultCard(puzzle, i)}
				{/each}
			</ul>
			<!-- Desktop table (hidden below sm) -->
			<table class="hidden w-full table-auto text-lg sm:table">
				<thead>
					<tr
						class="border-b border-stone-300 text-left text-sm tracking-wide text-stone-700 uppercase dark:border-stone-700 dark:text-stone-300"
					>
						<th scope="col" class="pb-2">{sr_column_number()}</th>
						<th scope="col" class="px-3 pb-2 md:px-4">{sr_column_puzzle()}</th>
						<th scope="col" class="px-2 pb-2 md:px-3">{sr_column_result()}</th>
						<th scope="col" class="px-2 pb-2 md:px-3">{sr_column_time()}</th>
						<th scope="col" class="px-2 pb-2 md:px-3">{sr_column_star()}</th>
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
