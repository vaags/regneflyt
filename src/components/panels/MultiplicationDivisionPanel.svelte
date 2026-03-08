<script lang="ts">
	import { Operator, getOperatorLabel } from '../../models/constants/Operator'
	import * as m from '$lib/paraglide/messages.js'
	import { AppSettings } from '../../models/constants/AppSettings'
	import PanelComponent from '../widgets/PanelComponent.svelte'

	let {
		operator,
		isAllOperators,
		possibleValues = $bindable()
	}: {
		operator: Operator
		isAllOperators: boolean
		possibleValues: Array<number>
	} = $props()

	const tables = Array.from(
		{ length: AppSettings.maxTable - AppSettings.minTable + 1 },
		(_, i) => AppSettings.minTable + i
	)

	function toggleValue(table: number) {
		if (possibleValues.includes(table)) {
			possibleValues = possibleValues.filter((v) => v !== table)
		} else {
			possibleValues = [...possibleValues, table]
		}
	}
</script>

<PanelComponent
	heading={operator === Operator.Multiplication
		? m.heading_multiplicand()
		: m.heading_divisor()}
	label={isAllOperators ? getOperatorLabel(operator) : undefined}
>
	{#each tables as table}
		<div>
			<label class="inline-flex items-center py-1">
				<input
					type="checkbox"
					class="h-5 w-5 rounded text-blue-700"
					checked={possibleValues.includes(table)}
					onchange={() => toggleValue(table)}
				/>
				<span class="ml-2 text-lg">{table}</span>
			</label>
		</div>
	{/each}
</PanelComponent>
