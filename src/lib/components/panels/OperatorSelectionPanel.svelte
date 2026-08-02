<script lang="ts">
	import { slide } from 'svelte/transition'
	import { AppSettings } from '$lib/constants/AppSettings'
	import {
		alert_must_select,
		heading_select_operator
	} from '$lib/paraglide/messages.js'
	import { OperatorExtended, getOperatorLabel } from '$lib/constants/Operator'
	import { createInitialLoadSlideTransitionState } from '$lib/helpers/initialLoadTransitionState.svelte'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import ValidationMessageComponent from '../widgets/ValidationMessageComponent.svelte'

	const operatorOptions = [
		OperatorExtended.Addition,
		OperatorExtended.Subtraction,
		OperatorExtended.Multiplication,
		OperatorExtended.Division,
		OperatorExtended.All
	] as const

	let {
		selectedOperator = undefined,
		onSelectedOperatorChange,
		showValidationError = false
	}: {
		selectedOperator?: OperatorExtended | undefined
		onSelectedOperatorChange: (operator: OperatorExtended) => void
		showValidationError?: boolean
	} = $props()

	const getSlideTransitionConfig = createInitialLoadSlideTransitionState(
		AppSettings.transitionDuration
	)
</script>

<div transition:slide={getSlideTransitionConfig()}>
	<PanelComponent
		heading={heading_select_operator()}
		headingTestId="heading-select-operator"
		stateKey="operator-selection"
	>
		<fieldset
			role="radiogroup"
			aria-labelledby="operator-selection-legend"
			aria-invalid={showValidationError ? 'true' : undefined}
			aria-describedby={showValidationError
				? 'operator-selection-error'
				: undefined}
		>
			<!-- role="radiogroup" is required for aria-invalid, and discards the
			     implicit legend naming, so name it back. -->
			<legend id="operator-selection-legend" class="sr-only"
				>{heading_select_operator()}</legend
			>
			{#each operatorOptions as operator (operator)}
				<label class="flex min-h-11 items-center py-1">
					<input
						type="radio"
						class="h-5 w-5"
						name="operator"
						data-testid="operator-{operator}"
						checked={selectedOperator === operator}
						onchange={() => onSelectedOperatorChange(operator)}
						value={operator}
					/>
					<span class="ml-2 text-lg">{getOperatorLabel(operator)}</span>
				</label>
			{/each}
		</fieldset>
		<ValidationMessageComponent
			id="operator-selection-error"
			testId="operator-selection-error"
			show={showValidationError}
			message={alert_must_select()}
		/>
	</PanelComponent>
</div>
