<script lang="ts">
	import DialogComponent from '../widgets/DialogComponent.svelte'
	import SkillBarComponent from '../widgets/SkillBarComponent.svelte'
	import { adaptiveSkills, totalCorrect, totalAttempted } from '../../stores'
	import * as m from '$lib/paraglide/messages.js'
	import { Operator, getOperatorLabel } from '../../models/constants/Operator'
	import { adaptiveTuning } from '../../models/AdaptiveProfile'

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

	export function open() {
		dialog.open()
	}
</script>

<DialogComponent bind:this={dialog} heading={m.heading_skill_level()}>
	<div class="mb-5">
		{#each operators as operator, i}
			<SkillBarComponent
				label={getOperatorLabel(operator)}
				value={skills[i] ?? 0}
				animated={false}
			/>
		{/each}
	</div>

	<div
		class="border-t border-gray-300 pt-3 text-center text-lg font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-200"
	>
		{m.label_total()}: {overall}%
	</div>

	{#if $totalAttempted > 0}
		<div class="mt-1 text-center text-sm text-gray-600 dark:text-gray-400">
			{m.heading_puzzles()}: {m.label_puzzles_solved({
				correct: $totalCorrect.toString(),
				attempted: $totalAttempted.toString()
			})}
		</div>
	{/if}
</DialogComponent>
