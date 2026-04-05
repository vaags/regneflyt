<script lang="ts">
	import type { Puzzle } from '$lib/models/Puzzle'
	import { onMount, untrack } from 'svelte'
	import { fade } from 'svelte/transition'
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
		alert_time_up,
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
		sr_column_number,
		sr_column_puzzle,
		sr_column_result,
		sr_column_star,
		sr_column_time
	} from '$lib/paraglide/messages.js'
	import { getLocale } from '$lib/paraglide/runtime.js'
	import { getQuizTitle } from '$lib/helpers/quizHelper'
	import { clampSkill } from '$lib/helpers/adaptiveHelper'
	import type { AdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
	import { Operator, getOperatorLabel } from '$lib/constants/Operator'
	import SkillBarComponent from '$lib/components/widgets/SkillBarComponent.svelte'
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
		timedOut = false,
		onGetReady = () => {},
		onReplay = undefined
	}: {
		puzzleSet: Puzzle[]
		quizStats: QuizStats
		quiz: Quiz
		preQuizSkill: AdaptiveSkillMap
		animateSkill?: boolean
		timedOut?: boolean
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
	let showAlert = $state(false)

	const activeOperators = [
		...new Set(initialPuzzleSet.map((p) => p.operator))
	].sort() as Operator[]

	// Reuse concept stats from QuizStats when available; fall back to local analysis
	// so feedback still works for callers that provide legacy stats payloads.
	const conceptStats = initialQuizStats.conceptStats
		? tuplesToConceptStats(initialQuizStats.conceptStats)
		: buildConceptPerformanceMap(initialPuzzleSet)
	const topWeakness = getTopSystematicWeakness(conceptStats)
	const feedbackMessage: FeedbackMessage | null =
		generateFeedbackMessage(topWeakness)

	function getReady() {
		onGetReady({ ...quiz })
	}

	onMount(() => {
		if (animateSkill) {
			if (timedOut) setTimeout(() => (showAlert = true), 100)
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
		class="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-lg dark:border-stone-700"
	>
		<span class="w-5 shrink-0 text-sm text-stone-500 dark:text-stone-400"
			>{index + 1}</span
		>
		<span class="flex-1 whitespace-nowrap">
			{#each puzzle.parts as part, i}
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
					<span class="mr-1">{getOperatorSign(puzzle.operator)}</span>
				{:else if i === 1}
					<span class="mr-1">=</span>
				{/if}
			{/each}
		</span>
		<span>
			{#if puzzle.isCorrect}
				<CheckmarkIconComponent label={label_correct()} />
			{:else}
				<CrossIconComponent label={label_incorrect()} />
			{/if}
		</span>
		<span
			class="text-base whitespace-nowrap text-stone-600 dark:text-stone-400"
		>
			{(Math.round(puzzle.duration * 10) / 10).toLocaleString(getLocale())}
			<span class="text-sm">{label_seconds_unit()}</span>
		</span>
		<span class="w-5 shrink-0">
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
			{#each puzzle.parts as part, i}
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
		{#if showAlert}
			<div class="mb-4" transition:fade={AppSettings.transitionDuration}>
				<AlertComponent color="yellow" dismissable
					>{alert_time_up()}</AlertComponent
				>
			</div>
		{/if}
		{#if !puzzleSet?.length}
			<AlertComponent color="yellow">{alert_no_completed()}</AlertComponent>
		{:else}
			{#if activeOperators.length > 0}
				<div class="mb-4 pb-4" aria-live="polite">
					<h3
						class="mb-2 text-lg font-semibold text-stone-800 dark:text-stone-200"
						data-testid="heading-results-skill"
					>
						{heading_skill_level()}
					</h3>
					{#each activeOperators as operator}
						{@const before = clampSkill(preQuizSkill[operator])}
						{@const after = clampSkill(quiz.adaptiveSkillByOperator[operator])}
						<SkillBarComponent
							label={getOperatorLabel(operator)}
							value={showAnimatedSkillValue ? after : before}
							delta={Math.round(after - before)}
							{showDelta}
							animated={showAnimatedTransition}
						/>
					{/each}
				</div>
			{/if}
			{#if feedbackMessage}
				<div class="mb-4 pb-4">
					<AlertComponent color="blue" title={feedbackMessage.title}>
						{feedbackMessage.concept} — {feedbackMessage.accuracy}.<br />
						{feedbackMessage.actionItem}
					</AlertComponent>
				</div>
			{/if}
			<h3
				class="mb-2 text-lg font-semibold text-stone-800 dark:text-stone-200"
				data-testid="heading-puzzles"
			>
				{heading_puzzles()}
			</h3>
			<!-- Mobile card list (hidden on sm and above) -->
			<ul class="space-y-1.5 sm:hidden">
				{#each puzzleSet as puzzle, i}
					{@render puzzleResultCard(puzzle, i)}
				{/each}
				<li class="mt-2 flex items-center gap-3 text-xl">
					<div class="flex items-center gap-1">
						<StarComponent label={label_stars()} />
						<span>× {quizStats.starCount}</span>
					</div>
					<CheckmarkIconComponent label={label_correct()} />
					<div class="flex items-baseline gap-2">
						<span>{quizStats.correctAnswerPercentage}%</span>
						<span class="text-base">
							{quizStats.correctAnswerCount}
							{label_of()}
							{puzzleSet.length}
						</span>
					</div>
				</li>
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
					{#each puzzleSet as puzzle, i}
						{@render puzzleResultRow(puzzle, i)}
					{/each}
					<tr>
						<td
							class="border-t-2 border-stone-300 py-2 pr-2 text-xl md:pr-3 md:text-2xl dark:border-stone-600"
							colspan={2}
						>
							<div class="flex flex-row items-center gap-1">
								<StarComponent label={label_stars()} />
								<span>× {quizStats.starCount}</span>
							</div>
						</td>
						<td
							class="border-t-2 border-stone-300 px-2 py-2 md:px-3 dark:border-stone-600"
						>
							<CheckmarkIconComponent label={label_correct()} />
						</td>
						<td
							class="border-t-2 border-stone-300 px-2 py-2 text-xl md:px-3 md:text-2xl dark:border-stone-600"
							colspan={2}
						>
							<div class="flex items-baseline gap-3">
								<span>{quizStats.correctAnswerPercentage}%</span>
								<span class="text-base md:text-lg">
									{quizStats.correctAnswerCount}
									{label_of()}
									{puzzleSet.length}
								</span>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
			{#if quizStats.correctAnswerPercentage < 100}
				<label class="mt-4 inline-flex items-center text-lg">
					<input
						type="checkbox"
						class="h-5 w-5 rounded text-sky-700"
						bind:checked={showCorrectAnswer}
					/>
					<span class="ml-2">{label_show_answer_key()}</span>
				</label>
			{/if}
		{/if}
	</PanelComponent>
</div>
