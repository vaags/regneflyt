<script lang="ts">
	import { Operator, getOperatorLabel } from '#lib/constants/Operator.ts'
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
		<legend class="sr-only">{heading}</legend>
		{#each tables as table (table)}
			<div>
				<label class="inline-flex min-h-11 min-w-11 items-center py-1">
					<input
						type="checkbox"
						class="h-5 w-5"
						checked={possibleValues.includes(table)}
						onchange={() => toggleValue(table)}
					/>
					<span class="ml-2 text-lg">{table}</span>
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
