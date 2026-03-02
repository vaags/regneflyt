<script lang="ts">
	import { Operator, operatorLabels } from '../../models/constants/Operator'
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
	heading={operator === Operator.Multiplication ? 'Multiplikand' : 'Divisor'}
	label={isAllOperators ? operatorLabels[operator] : undefined}
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
