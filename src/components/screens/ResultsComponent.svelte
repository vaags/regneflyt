<script lang="ts">
	import type { Puzzle } from '../../models/Puzzle'
	import { onMount } from 'svelte'
	import { fade } from 'svelte/transition'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import ButtonComponent from '../widgets/ButtonComponent.svelte'
	import AlertComponent from '../widgets/AlertComponent.svelte'
	import HiddenValueComponent from '../widgets/HiddenValueComponent.svelte'
	import type { QuizStats } from '../../models/QuizStats'
	import { AppSettings } from '../../models/constants/AppSettings'
	import { getOperatorSign } from '../../models/constants/Operator'
	import type { Quiz } from '../../models/Quiz'
	import CheckmarkIconComponent from '../icons/CheckmarkComponent.svelte'
	import CrossIconComponent from '../icons/CrossComponent.svelte'
	import StarComponent from '../icons/StarComponent.svelte'
	import * as m from '$lib/paraglide/messages.js'
	import { getLocale } from '$lib/paraglide/runtime.js'
	import { getQuizTitle } from '../../helpers/quizHelper'
	import { clampSkill } from '../../helpers/adaptiveHelper'
	import type { AdaptiveSkillMap } from '../../models/AdaptiveProfile'
	import { Operator, getOperatorLabel } from '../../models/constants/Operator'

	export let puzzleSet: Puzzle[]
	export let quizStats: QuizStats
	export let quiz: Quiz
	export let preQuizSkill: AdaptiveSkillMap
	export let animateSkill = true
	export let onGetReady: (quiz: Quiz) => void = () => {}
	export let onResetQuiz: () => void = () => {}

	let showComponent: boolean
	let showCorrectAnswer = false
	let animated = !animateSkill
	let showDelta = !animateSkill
	let showAlert = false

	const activeOperators = [
		...new Set(puzzleSet.map((p) => p.operator))
	].sort() as Operator[]

	function getReady() {
		onGetReady({ ...quiz })
	}

	function resetQuiz() {
		onResetQuiz()
	}

	onMount(() => {
		setTimeout(() => {
			showComponent = true
		}, AppSettings.pageTransitionDuration.duration)

		if (animateSkill) {
			setTimeout(() => (showAlert = true), 100)
			// Stagger skill bar animation: bars grow at 600ms, delta text appears at 1300ms
			setTimeout(() => (animated = true), 600)
			setTimeout(() => (showDelta = true), 1300)
		}
	})
</script>

{#if showComponent}
	<div transition:fade={AppSettings.pageTransitionDuration}>
		<PanelComponent heading={m.heading_results()} label={getQuizTitle(quiz)}>
			{#if showAlert}
				<div class="mb-4" transition:fade={AppSettings.transitionDuration}>
					<AlertComponent color="yellow" dismissable
						>{m.alert_time_up()}</AlertComponent
					>
				</div>
			{/if}
			{#if !puzzleSet?.length}
				<AlertComponent color="yellow">{m.alert_no_completed()}</AlertComponent>
			{:else}
				{#if activeOperators.length > 0}
					<div class="mb-4 pb-4" aria-live="polite">
						<h3
							class="mb-2 text-lg font-semibold text-gray-800 dark:text-gray-200"
						>
							{m.heading_skill_level()}
						</h3>
						{#each activeOperators as operator}
							{@const before = clampSkill(preQuizSkill[operator])}
							{@const after = clampSkill(
								quiz.adaptiveSkillByOperator[operator]
							)}
							{@const delta = Math.round(after - before)}
							<div class="mb-2">
								<div
									class="mb-1 flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
								>
									<span>{getOperatorLabel(operator)}</span>
									<span>
										<span class="font-semibold">{Math.round(after)}%</span>
										{#if showDelta && delta !== 0}
											<span
												class="ml-1 text-xs font-semibold {delta > 0
													? 'text-green-600 dark:text-green-400'
													: 'text-red-600 dark:text-red-400'}"
											>
												{delta > 0 ? '+' : ''}{delta}
											</span>
										{/if}
									</span>
								</div>
								<div
									class="flex h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
									role="progressbar"
									aria-valuenow={Math.round(animated ? after : before)}
									aria-valuemin={0}
									aria-valuemax={100}
									aria-label={getOperatorLabel(operator)}
								>
									<div
										class="h-2 rounded-full bg-blue-600 transition-all duration-700 ease-out dark:bg-blue-400"
										style="width: {animated ? after : before}%"
									></div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
				<h3 class="mb-2 text-lg font-semibold text-gray-800 dark:text-gray-200">
					{m.heading_puzzles()}
				</h3>
				{#if quizStats.correctAnswerPercentage < 100}
					<label class="mb-4 inline-flex items-center text-lg">
						<input
							type="checkbox"
							class="h-5 w-5 rounded text-blue-700"
							bind:checked={showCorrectAnswer}
						/>
						<span class="ml-2">{m.label_show_answer_key()}</span>
					</label>
				{/if}
				<table class="w-full table-auto text-lg">
					<thead class="sr-only">
						<tr>
							<th scope="col">{m.sr_column_number()}</th>
							<th scope="col">{m.sr_column_puzzle()}</th>
							<th scope="col">{m.sr_column_result()}</th>
							<th scope="col">{m.sr_column_time()}</th>
							<th scope="col">{m.sr_column_star()}</th>
						</tr>
					</thead>
					<tbody>
						{#each puzzleSet as puzzle, i}
							<tr>
								<td
									class="border-t border-gray-300 py-2 text-gray-800 dark:border-gray-700 dark:text-gray-200"
								>
									{i + 1}
								</td>
								<td
									class="border-t border-gray-300 px-3 py-2 whitespace-nowrap md:px-4 dark:border-gray-700"
								>
									{#each puzzle.parts as part, i}
										{#if puzzle.unknownPuzzlePart === i}
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
									class="border-t border-gray-300 px-2 py-2 md:px-3 dark:border-gray-700"
								>
									{#if puzzle.isCorrect}
										<CheckmarkIconComponent label={m.label_correct()} />
									{:else}
										<CrossIconComponent label={m.label_incorrect()} />
									{/if}
								</td>
								<td
									class="border-t border-gray-300 px-2 py-2 whitespace-nowrap md:px-3 dark:border-gray-700"
								>
									{(Math.round(puzzle.duration * 10) / 10).toLocaleString(
										getLocale()
									)}
									<span class="text-sm">{m.label_seconds_unit()}</span>
								</td>
								<td
									class="border-t border-gray-300 px-2 py-2 md:px-3 dark:border-gray-700"
								>
									{#if puzzle.isCorrect && puzzle.duration <= AppSettings.regneflytThresholdSeconds}
										<StarComponent label={m.label_regneflyt()} />
									{/if}
								</td>
							</tr>
						{/each}
						<tr>
							<td
								class="border-t-2 border-gray-300 py-2 pr-2 text-xl md:pr-3 md:text-2xl dark:border-gray-600"
								colspan={2}
							>
								<div class="flex flex-row items-center">
									<StarComponent label={m.label_stars()} />
									<span>{quizStats.starCount}</span>
								</div>
							</td>
							<td
								class="border-t-2 border-gray-300 px-3 py-2 text-xl md:px-4 md:text-2xl dark:border-gray-600"
								colspan={3}
							>
								{quizStats.correctAnswerPercentage}
								%
								<span class="text-sm md:text-base">
									({quizStats.correctAnswerCount}
									{m.label_of()}
									{puzzleSet.length})
								</span>
							</td>
						</tr>
					</tbody>
				</table>
			{/if}
		</PanelComponent>

		<div class="flex justify-between gap-2 md:gap-3">
			<ButtonComponent on:click={getReady} color="green"
				>{m.button_start()}</ButtonComponent
			>
			<ButtonComponent on:click={resetQuiz}>{m.button_menu()}</ButtonComponent>
		</div>
	</div>
{/if}
