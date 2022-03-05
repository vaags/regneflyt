<script lang="ts">
	import { slide } from 'svelte/transition'
	import { createEventDispatcher } from 'svelte'
	import { AppSettings } from '../../models/constants/AppSettings'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import { OperatorExtended } from '../../models/constants/Operator'

	const dispatch = createEventDispatcher()

	const hideWelcomePanel = () => dispatch('hideWelcomePanel')

	export let selectedOperator: OperatorExtended | undefined = undefined
</script>

<div transition:slide|local={AppSettings.transitionDuration}>
	<PanelComponent heading="Velg regneart">
		{#each Object.values(OperatorExtended) as operator, i}
			<label class="flex items-center py-1">
				<input
					type="radio"
					class="h-5 w-5 text-blue-700"
					bind:group={selectedOperator}
					on:click|once={hideWelcomePanel}
					value={operator}
				/>
				<span class="ml-2 text-lg">{AppSettings.operatorLabels[i]}</span>
			</label>
		{/each}
	</PanelComponent>
</div>
