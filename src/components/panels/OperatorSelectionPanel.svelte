<script lang="ts">
	import { slide } from 'svelte/transition'
	import { AppSettings } from '../../models/constants/AppSettings'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import { OperatorExtended } from '../../models/constants/Operator'

	const operatorOptions = [
		OperatorExtended.Addition,
		OperatorExtended.Subtraction,
		OperatorExtended.Multiplication,
		OperatorExtended.Division,
		OperatorExtended.All
	] as const

	export let onHideWelcomePanel: () => void = () => {}

	const hideWelcomePanel = () => onHideWelcomePanel()

	export let selectedOperator: OperatorExtended | undefined = undefined
</script>

<div transition:slide={AppSettings.transitionDuration}>
	<PanelComponent heading="Velg regneart">
		{#each operatorOptions as operator}
			<label class="flex items-center py-1">
				<input
					type="radio"
					class="h-5 w-5 text-blue-700"
					bind:group={selectedOperator}
					on:click|once={hideWelcomePanel}
					value={operator}
				/>
				<span class="ml-2 text-lg">{AppSettings.operatorLabels[operator]}</span>
			</label>
		{/each}
	</PanelComponent>
</div>
