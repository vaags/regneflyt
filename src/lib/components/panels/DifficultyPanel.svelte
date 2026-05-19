<script lang="ts">
	import { slide } from 'svelte/transition'
	import { AppSettings } from '$lib/constants/AppSettings'
	import {
		difficulty_adaptive,
		difficulty_custom,
		heading_difficulty,
		label_estimation_mode_description
	} from '$lib/paraglide/messages.js'
	import {
		adaptiveDifficultyId,
		customDifficultyId,
		type DifficultyMode
	} from '$lib/models/AdaptiveProfile'
	import { createInitialLoadSlideTransitionState } from '$lib/helpers/initialLoadTransitionState.svelte'
	import PanelComponent from '../widgets/PanelComponent.svelte'

	let {
		difficultyMode = undefined,
		estimationMode = false,
		onSetDifficultyMode = () => {},
		onEstimationModeChange = () => {}
	}: {
		difficultyMode?: DifficultyMode | undefined
		estimationMode?: boolean
		onSetDifficultyMode?: (mode: DifficultyMode) => void
		onEstimationModeChange?: (value: boolean) => void
	} = $props()

	const difficultyModes = [
		{ id: adaptiveDifficultyId, getLabel: () => difficulty_adaptive() },
		{ id: customDifficultyId, getLabel: () => difficulty_custom() }
	] as const

	const getSlideTransitionConfig = createInitialLoadSlideTransitionState(
		AppSettings.transitionDuration
	)
</script>

<div transition:slide={getSlideTransitionConfig()}>
	<PanelComponent heading={heading_difficulty()}>
		<fieldset>
			<legend class="sr-only">{heading_difficulty()}</legend>
			<div class="mb-1">
				{#each difficultyModes as option (option.id)}
					<label for="l-{option.id}" class="flex items-center py-1">
						<input
							id="l-{option.id}"
							class="h-5 w-5"
							type="radio"
							name="difficulty"
							data-testid="difficulty-{option.id}"
							value={option.id}
							checked={difficultyMode === option.id}
							onchange={() => onSetDifficultyMode(option.id)}
						/>
						<span class="ml-2 text-lg">{option.getLabel()}</span>
					</label>
				{/each}
			</div>
		</fieldset>
		{#if difficultyMode === adaptiveDifficultyId}
			<label class="flex items-center py-1" data-testid="estimation-mode-row">
				<input
					type="checkbox"
					class="h-5 w-5"
					data-testid="estimation-mode-toggle"
					checked={estimationMode}
					onchange={(e) =>
						onEstimationModeChange(
							(e.currentTarget as HTMLInputElement).checked
						)}
				/>
				<span class="ml-2 text-lg">
					{label_estimation_mode_description()}
				</span>
			</label>
		{/if}
	</PanelComponent>
</div>
