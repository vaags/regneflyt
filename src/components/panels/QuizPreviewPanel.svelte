<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import { slide } from 'svelte/transition'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import { AppSettings } from '../../models/constants/AppSettings'
	import type { Puzzle } from '../../models/Puzzle'
	import PuzzlePreviewComponent from '../widgets/PuzzlePreviewComponent.svelte'
	import AlertComponent from '../widgets/AlertComponent.svelte'
	import ButtonComponent from '../widgets/ButtonComponent.svelte'
	import {
		previewSimulationEventName,
		previewSimulationOutcomes
	} from '../../models/constants/PreviewSimulation'

	export let puzzle: Puzzle
	export let validationError: boolean

	const dispatch = createEventDispatcher()
</script>

<div transition:slide={AppSettings.transitionDuration}>
	<PanelComponent heading="Eksempel">
		{#if validationError}
			<div class="mt-4" transition:slide={AppSettings.transitionDuration}>
				<AlertComponent color="yellow"
					>Kan ikke vise forhåndsvisning.</AlertComponent
				>
			</div>
		{:else}
			<div class="mb-1 flex flex-col items-center gap-3 text-3xl md:text-4xl">
				<div>
					<PuzzlePreviewComponent {puzzle} />
				</div>
				<div class="mt-2 flex flex-row items-center justify-center gap-2">
					<ButtonComponent
						color="green"
						size="small"
						title="Simuler riktig svar"
						on:click={() =>
							dispatch(previewSimulationEventName, {
								outcome: previewSimulationOutcomes.correct
							})}>✓</ButtonComponent
					>
					<ButtonComponent
						color="red"
						size="small"
						title="Simuler feil svar"
						on:click={() =>
							dispatch(previewSimulationEventName, {
								outcome: previewSimulationOutcomes.incorrect
							})}>✗</ButtonComponent
					>
				</div>
			</div>
		{/if}
	</PanelComponent>
</div>
