<script lang="ts">
	import { slide } from 'svelte/transition'
	import { AppSettings } from '$lib/constants/AppSettings'
	import {
		alert_must_select,
		heading_select_operator
	} from '$lib/paraglide/messages.js'
	import { OperatorExtended, getOperatorLabel } from '$lib/constants/Operator'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import AlertComponent from '../widgets/AlertComponent.svelte'

	const operatorOptions = [
		OperatorExtended.Addition,
		OperatorExtended.Subtraction,
		OperatorExtended.Multiplication,
		OperatorExtended.Division,
		OperatorExtended.All
	] as const

	let {
		selectedOperator = $bindable(undefined),
		showValidationError = false
	}: {
		selectedOperator?: OperatorExtended | undefined
		showValidationError?: boolean
	} = $props()
</script>

<div transition:slide={AppSettings.transitionDuration}>
	<PanelComponent
		heading={heading_select_operator()}
		headingTestId="heading-select-operator"
	>
		<fieldset>
			<legend class="sr-only">{heading_select_operator()}</legend>
			{#each operatorOptions as operator}
				<label class="flex items-center py-1">
					<input
						type="radio"
						class="h-5 w-5 text-sky-700"
						name="operator"
						data-testid="operator-{operator}"
						checked={selectedOperator === operator}
						onchange={() => (selectedOperator = operator)}
						value={operator}
					/>
					<span class="ml-2 text-lg">{getOperatorLabel(operator)}</span>
				</label>
			{/each}
		</fieldset>
		{#if showValidationError}
			<div
				transition:slide={AppSettings.transitionDuration}
				class="pt-3"
				aria-live="assertive"
			>
				<AlertComponent color="red">{alert_must_select()}</AlertComponent>
			</div>
		{/if}
	</PanelComponent>
</div>
