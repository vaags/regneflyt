<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import { slide } from 'svelte/transition'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import { AppSettings } from '../../models/constants/AppSettings'
	import type { Puzzle } from '../../models/Puzzle'
	import PuzzlePreviewComponent from '../widgets/PuzzlePreviewComponent.svelte'
	import AlertComponent from '../widgets/AlertComponent.svelte'
	import LabelComponent from '../widgets/LabelComponent.svelte'
	import ButtonOutlined from '../widgets/ButtonOutlinedComponent.svelte'
	import {
		previewSimulationEventName,
		previewSimulationOutcomes
	} from '../../models/constants/PreviewSimulation'

	export let title: string | undefined
	export let puzzle: Puzzle
	export let validationError: boolean

	const dispatch = createEventDispatcher()
</script>

<div transition:slide={AppSettings.transitionDuration}>
	<div class="float-right mt-5 mr-5">
		<LabelComponent>Eksempel</LabelComponent>
	</div>
	<PanelComponent heading={title}>
		{#if validationError}
			<div class="mt-4" transition:slide={AppSettings.transitionDuration}>
				<AlertComponent color="yellow"
					>Kan ikke vise forhåndsvisning.</AlertComponent
				>
			</div>
		{:else}
			<div class="mb-1 grid grid-cols-4 items-center text-3xl md:text-4xl">
				<div></div>
				<div class="col-span-2 justify-self-center">
					<PuzzlePreviewComponent {puzzle} />
				</div>
				<div class="flex flex-col items-end gap-2 justify-self-end">
					<ButtonOutlined
						title="Simuler riktig svar"
						large={true}
						on:click={() =>
							dispatch(previewSimulationEventName, {
								outcome: previewSimulationOutcomes.correct
							})}>✓</ButtonOutlined
					>
					<ButtonOutlined
						title="Simuler feil svar"
						large={true}
						on:click={() =>
							dispatch(previewSimulationEventName, {
								outcome: previewSimulationOutcomes.incorrect
							})}>✗</ButtonOutlined
					>
				</div>
			</div>
		{/if}
	</PanelComponent>
</div>
