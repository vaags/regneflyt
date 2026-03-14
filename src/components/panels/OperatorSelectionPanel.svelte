<script lang="ts">
	import { slide } from 'svelte/transition'
	import { AppSettings } from '../../models/constants/AppSettings'
	import * as m from '$lib/paraglide/messages.js'
	import {
		OperatorExtended,
		getOperatorLabel
	} from '../../models/constants/Operator'
	import PanelComponent from '../widgets/PanelComponent.svelte'

	const operatorOptions = [
		OperatorExtended.Addition,
		OperatorExtended.Subtraction,
		OperatorExtended.Multiplication,
		OperatorExtended.Division,
		OperatorExtended.All
	] as const

	let {
		selectedOperator = $bindable(undefined)
	}: {
		selectedOperator?: OperatorExtended | undefined
	} = $props()

	function selectOperator(operator: OperatorExtended) {
		selectedOperator = operator
	}
</script>

<div transition:slide={AppSettings.transitionDuration}>
	<PanelComponent
		heading={m.heading_select_operator()}
		headingTestId="heading-select-operator"
	>
		<fieldset>
			<legend class="sr-only">{m.heading_select_operator()}</legend>
			{#each operatorOptions as operator}
				<label class="flex items-center py-1">
					<input
						type="radio"
						class="h-5 w-5 text-blue-700"
						name="operator"
						data-testid="operator-{operator}"
						checked={selectedOperator === operator}
						onchange={() => selectOperator(operator)}
						value={operator}
					/>
					<span class="ml-2 text-lg">{getOperatorLabel(operator)}</span>
				</label>
			{/each}
		</fieldset>
	</PanelComponent>
</div>
