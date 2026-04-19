<script lang="ts">
	import { Operator, getOperatorLabel } from '$lib/constants/Operator'
	import {
		heading_divisor,
		heading_multiplicand
	} from '$lib/paraglide/messages.js'
	import { AppSettings } from '$lib/constants/AppSettings'
	import PanelComponent from '../widgets/PanelComponent.svelte'

	let {
		operator,
		isAllOperators,
		possibleValues,
		onPossibleValuesChange
	}: {
		operator: Operator
		isAllOperators: boolean
		possibleValues: Array<number>
		onPossibleValuesChange: (possibleValues: number[]) => void
	} = $props()

	const tables = Array.from(
		{ length: AppSettings.maxTable - AppSettings.minTable + 1 },
		(_, i) => AppSettings.minTable + i
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
	heading={operator === Operator.Multiplication
		? heading_multiplicand()
		: heading_divisor()}
	label={isAllOperators ? getOperatorLabel(operator) : undefined}
>
	{#each tables as table (table)}
		<div>
			<label class="inline-flex items-center py-1">
				<input
					type="checkbox"
					class="form-checkbox h-5 w-5 rounded text-sky-700"
					checked={possibleValues.includes(table)}
					onchange={() => toggleValue(table)}
				/>
				<span class="ml-2 text-lg">{table}</span>
			</label>
		</div>
	{/each}
</PanelComponent>
