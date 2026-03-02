<script lang="ts">
	import { Operator, operatorLabels } from '../../models/constants/Operator'
	import PanelComponent from '../widgets/PanelComponent.svelte'

	export let operator: Operator
	export let isAllOperators: boolean
	export let possibleValues: Array<number>
</script>

<PanelComponent
	heading={operator === Operator.Multiplication ? 'Multiplikand' : 'Divisor'}
	label={isAllOperators ? operatorLabels[operator] : undefined}
>
	{#each Array(12) as _, i}
		<div>
			<label class="inline-flex items-center py-1">
				<input
					type="checkbox"
					class="h-5 w-5 rounded text-blue-700"
					bind:group={possibleValues}
					value={i}
				/>
				<span class="ml-2 text-lg">{i}</span>
			</label>
		</div>
	{/each}
</PanelComponent>
