<script lang="ts">
	import { slide } from 'svelte/transition'
	import { AppSettings } from '../../models/constants/AppSettings'
	import * as m from '$lib/paraglide/messages.js'
	import {
		OperatorExtended,
		getOperatorLabel
	} from '../../models/constants/Operator'
	import PanelComponent from '../widgets/PanelComponent.svelte'

	const operatorOptions = [
		OperatorExtended.Addition,
		OperatorExtended.Subtraction,
		OperatorExtended.Multiplication,
		OperatorExtended.Division,
		OperatorExtended.All
	] as const

	export let onHideWelcomePanel: () => void = () => {}

	const hideWelcomePanel = () => onHideWelcomePanel()

	export let selectedOperator: OperatorExtended | undefined = undefined
</script>

<div transition:slide={AppSettings.transitionDuration}>
	<PanelComponent heading={m.heading_select_operator()}>
		{#each operatorOptions as operator}
			<label class="flex items-center py-1">
				<input
					type="radio"
					class="h-5 w-5 text-blue-700"
					bind:group={selectedOperator}
					on:click|once={hideWelcomePanel}
					value={operator}
				/>
				<span class="ml-2 text-lg">{getOperatorLabel(operator)}</span>
			</label>
		{/each}
	</PanelComponent>
</div>
