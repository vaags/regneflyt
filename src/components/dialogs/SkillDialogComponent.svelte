<script lang="ts">
	import DialogComponent from '../widgets/DialogComponent.svelte'
	import SkillBarComponent from '../widgets/SkillBarComponent.svelte'
	import { adaptiveSkills, practiceStreak } from '../../stores'
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
		class="border-t border-stone-300 pt-3 text-center text-lg font-semibold text-stone-800 dark:border-stone-700 dark:text-stone-200"
		data-testid="skill-total"
	>
		{m.label_total()}: {overall}%
	</div>

	{#if $practiceStreak.streak >= 2}
		<div
			class="mt-2 text-center text-sm text-stone-600 dark:text-stone-400"
			data-testid="practice-streak"
		>
			{m.label_streak_days({ count: $practiceStreak.streak.toString() })} 🔥
		</div>
	{/if}
</DialogComponent>
