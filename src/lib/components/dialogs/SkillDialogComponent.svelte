<script lang="ts">
	import DialogComponent from '../widgets/DialogComponent.svelte'
	import SkillBarComponent from '../widgets/SkillBarComponent.svelte'
	import { adaptiveSkills, overallSkill, practiceStreak } from '$lib/stores'
	import {
		heading_skill_level,
		label_streak_days,
		label_total
	} from '$lib/paraglide/messages.js'
	import { getLocale, type Locale } from '$lib/paraglide/runtime.js'
	import { Operator, getOperatorLabel } from '$lib/constants/Operator'

	let { locale = getLocale() }: { locale?: Locale | undefined } = $props()

	let dialog = $state<DialogComponent | undefined>(undefined)

	const operators = [
		Operator.Addition,
		Operator.Subtraction,
		Operator.Multiplication,
		Operator.Division
	]

	let skills = $derived(operators.map((op) => adaptiveSkills.current[op] ?? 0))

	export function open() {
		dialog?.open()
	}
</script>

<DialogComponent
	bind:this={dialog}
	heading={heading_skill_level({}, { locale })}
	{locale}
	headingTestId="heading-skill-level"
>
	<div class="mb-5">
		{#each operators as operator, i (operator)}
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
		{label_total({}, { locale })}: {overallSkill.current}%
	</div>

	{#if practiceStreak.current.streak >= 2}
		<div
			class="mt-2 text-center text-sm text-stone-600 dark:text-stone-400"
			data-testid="practice-streak"
		>
			{label_streak_days(
				{ count: practiceStreak.current.streak.toString() },
				{ locale }
			)} 🔥
		</div>
	{/if}
</DialogComponent>
