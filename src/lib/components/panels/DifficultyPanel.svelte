<script lang="ts">
	import { slide } from 'svelte/transition'
	import { AppSettings } from '$lib/constants/AppSettings'
	import {
		difficulty_adaptive,
		difficulty_custom,
		heading_difficulty
	} from '$lib/paraglide/messages.js'
	import {
		adaptiveDifficultyId,
		customAdaptiveDifficultyId,
		type DifficultyMode
	} from '$lib/models/AdaptiveProfile'
	import PanelComponent from '../widgets/PanelComponent.svelte'

	let {
		difficultyMode = undefined,
		onSetDifficultyMode = () => {}
	}: {
		difficultyMode?: DifficultyMode | undefined
		onSetDifficultyMode?: (mode: DifficultyMode) => void
	} = $props()

	const difficultyModes = [
		{ id: adaptiveDifficultyId, getLabel: () => difficulty_adaptive() },
		{ id: customAdaptiveDifficultyId, getLabel: () => difficulty_custom() }
	] as const
</script>

<div transition:slide={AppSettings.transitionDuration}>
	<PanelComponent heading={heading_difficulty()}>
		<fieldset>
			<legend class="sr-only">{heading_difficulty()}</legend>
			<div class="mb-1">
				{#each difficultyModes as option (option.id)}
					<label for="l-{option.id}" class="flex items-center py-1">
						<input
							id="l-{option.id}"
							class="h-5 w-5 text-sky-700"
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
	</PanelComponent>
</div>
