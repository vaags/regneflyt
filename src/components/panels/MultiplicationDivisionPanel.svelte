<script lang="ts">
	import { Operator, getOperatorLabel } from '../../models/constants/Operator'
	import * as m from '$lib/paraglide/messages.js'
	import { AppSettings } from '../../models/constants/AppSettings'
	import PanelComponent from '../widgets/PanelComponent.svelte'

	export let operator: Operator
	export let isAllOperators: boolean
	export let possibleValues: Array<number>

	const tables = Array.from(
		{ length: AppSettings.maxTable - AppSettings.minTable + 1 },
		(_, i) => AppSettings.minTable + i
	)
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
					bind:group={possibleValues}
					value={table}
				/>
				<span class="ml-2 text-lg">{table}</span>
			</label>
		</div>
	{/each}
</PanelComponent>
