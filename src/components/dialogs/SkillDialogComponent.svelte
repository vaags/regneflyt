<script lang="ts">
	import DialogComponent from '../widgets/DialogComponent.svelte'
	import SkillBarComponent from '../widgets/SkillBarComponent.svelte'
	import {
		adaptiveSkills,
		totalCorrect,
		totalAttempted,
		totalQuizzes,
		personalBests
	} from '../../stores'
	import * as m from '$lib/paraglide/messages.js'
	import { Operator, getOperatorLabel } from '../../models/constants/Operator'
	import { adaptiveTuning } from '../../models/AdaptiveProfile'
	import { getLocale } from '$lib/paraglide/runtime.js'

	let dialog = $state<DialogComponent>(undefined!)

	const operators = [
		Operator.Addition,
		Operator.Subtraction,
		Operator.Multiplication,
		Operator.Division
	]

	let skills = $derived(operators.map((op) => $adaptiveSkills[op] ?? 0))

	let overall = $derived(
		Math.round(
			skills.reduce((sum, s) => sum + s, 0) /
				adaptiveTuning.adaptiveAllOperatorCount
		)
	)

	let hasAnyPersonalBest = $derived(
		operators.some((op) => $personalBests[op].bestAccuracy > 0)
	)

	export function open() {
		dialog.open()
	}
</script>

<DialogComponent
	bind:this={dialog}
	heading={m.heading_skill_level()}
	headingTestId="heading-skill-level"
>
	<div class="mb-5">
		{#each operators as operator, i}
			<SkillBarComponent
				label={getOperatorLabel(operator)}
				value={skills[i] ?? 0}
				animated={false}
				testId="skill-operator-{operator}"
			/>
		{/each}
	</div>

	<div
		class="border-t border-gray-300 pt-3 text-center text-lg font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-200"
		data-testid="skill-total"
	>
		{m.label_total()}: {overall}%
	</div>

	{#if $totalAttempted > 0}
		<div
			class="mt-1 text-center text-sm text-gray-600 dark:text-gray-400"
			data-testid="stats-summary"
		>
			<span
				>{$totalQuizzes === 1
					? m.label_quizzes_completed_one({ count: $totalQuizzes.toString() })
					: m.label_quizzes_completed_other({
							count: $totalQuizzes.toString()
						})}</span
			>
			&middot;
			<span
				>{m.heading_puzzles()}: {m.label_puzzles_solved({
					correct: $totalCorrect.toString(),
					attempted: $totalAttempted.toString()
				})}</span
			>
		</div>
	{/if}

	{#if hasAnyPersonalBest}
		<div
			class="mt-4 border-t border-gray-300 pt-3 dark:border-gray-700"
			data-testid="personal-bests"
		>
			<h3
				class="mb-2 text-center text-sm font-semibold text-gray-800 dark:text-gray-200"
			>
				{m.heading_personal_best()}
			</h3>
			<div
				class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400"
			>
				{#each operators as operator}
					{@const best = $personalBests[operator]}
					{#if best.bestAccuracy > 0}
						<div
							class="text-right font-medium text-gray-700 dark:text-gray-300"
						>
							{getOperatorLabel(operator)}
						</div>
						<div>
							{best.bestAccuracy}%{#if best.fastestAvgTime !== null}
								&middot; {best.fastestAvgTime.toLocaleString(
									getLocale()
								)}{m.label_seconds_unit()}
							{/if}
						</div>
					{/if}
				{/each}
			</div>
		</div>
	{/if}
</DialogComponent>
