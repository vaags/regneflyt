<script lang="ts">
	import { Operator } from '#lib/domain/arithmetic/operator.ts'
	import { getOperatorLabel } from '#lib/integrations/paraglide/operatorLabels.ts'
	import {
		alert_select_number,
		heading_divisor,
		heading_multiplicand
	} from '#lib/paraglide/messages.js'
	import { AppSettings } from '#lib/constants/AppSettings.ts'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import ValidationMessageComponent from '../widgets/ValidationMessageComponent.svelte'

	let {
		operator,
		isAllOperators,
		hasMissingMultiplicationValues,
		hasMissingDivisionValues,
		possibleValues,
		onPossibleValuesChange
	}: {
		operator: Operator
		isAllOperators: boolean
		hasMissingMultiplicationValues: boolean
		hasMissingDivisionValues: boolean
		possibleValues: Array<number>
		onPossibleValuesChange: (possibleValues: number[]) => void
	} = $props()

	const tables = Array.from(
		{ length: AppSettings.maxTable - AppSettings.minTable + 1 },
		(_, i) => AppSettings.minTable + i
	)

	let heading = $derived(
		operator === Operator.Multiplication
			? heading_multiplicand()
			: heading_divisor()
	)
	let errorId = $derived(`table-values-error-${operator}`)
	let hasNoSelection = $derived(
		(operator === Operator.Multiplication && hasMissingMultiplicationValues) ||
			(operator === Operator.Division && hasMissingDivisionValues)
	)

	function toggleValue(table: number) {
		if (possibleValues.includes(table)) {
			onPossibleValuesChange(possibleValues.filter((v) => v !== table))
		} else {
			onPossibleValuesChange([...possibleValues, table])
		}
	}
</script>

<PanelComponent
	{heading}
	label={isAllOperators ? getOperatorLabel(operator) : undefined}
	stateKey="table-values-{operator}"
>
	<!-- No aria-invalid: unlike the operator radiogroup, a checkbox set keeps the
	     implicit `group` role, which does not support the attribute. -->
	<fieldset aria-describedby={hasNoSelection ? errorId : undefined}>
		<legend class="visually-hidden">{heading}</legend>
		{#each tables as table (table)}
			<div>
				<label class="option">
					<input
						type="checkbox"
						checked={possibleValues.includes(table)}
						onchange={() => toggleValue(table)}
					/>
					<span>{table}</span>
				</label>
			</div>
		{/each}
	</fieldset>
	<ValidationMessageComponent
		id={errorId}
		testId={errorId}
		show={hasNoSelection}
		message={alert_select_number()}
	/>
</PanelComponent>

<style>
	.option {
		display: inline-flex;
		align-items: center;
		min-inline-size: var(--target-minimum);
		min-block-size: var(--target-minimum);
		gap: 0.5rem;
		padding-block: 0.25rem;
		font-size: 1.125rem;
	}
</style>
