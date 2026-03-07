<script lang="ts">
	import DialogComponent from '../widgets/DialogComponent.svelte'
	import { adaptiveProfiles } from '../../stores'
	import { Operator, operatorLabels } from '../../models/constants/Operator'
	import { adaptiveTuning } from '../../models/AdaptiveProfile'

	let dialog: DialogComponent

	const operators = [
		Operator.Addition,
		Operator.Subtraction,
		Operator.Multiplication,
		Operator.Division
	]

	$: skills = operators.map((op) =>
		Math.max(
			$adaptiveProfiles.adaptive[op] ?? 0,
			$adaptiveProfiles.custom[op] ?? 0
		)
	)

	$: overall = Math.round(
		skills.reduce((sum, s) => sum + s, 0) /
			adaptiveTuning.adaptiveAllOperatorCount
	)

	export function open() {
		dialog.open()
	}
</script>

<DialogComponent bind:this={dialog} heading="Ferdighetsnivå">
	<div class="mb-5">
		{#each operators as operator, i}
			<div class="mb-3">
				<div
					class="mb-1 flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
				>
					<span>{operatorLabels[operator]}</span>
					<span class="font-semibold">{skills[i]}%</span>
				</div>
				<div
					class="flex h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
				>
					<div
						class="h-2 rounded-full bg-blue-600 dark:bg-blue-400"
						style="width: {skills[i]}%"
					></div>
				</div>
			</div>
		{/each}
	</div>

	<div
		class="border-t border-gray-300 pt-3 text-center text-lg font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-200"
	>
		Totalt: {overall}%
	</div>
</DialogComponent>
