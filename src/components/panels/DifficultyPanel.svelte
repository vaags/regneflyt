<script lang="ts">
	import { slide } from 'svelte/transition'
	import { AppSettings } from '../../models/constants/AppSettings'
	import * as m from '$lib/paraglide/messages.js'
	import {
		adaptiveDifficultyId,
		customAdaptiveDifficultyId,
		type DifficultyMode
	} from '../../models/AdaptiveProfile'
	import {
		getAdaptiveDifficultyLabel,
		getCustomDifficultyLabel
	} from '../../models/constants/DifficultyLabels'
	import PanelComponent from '../widgets/PanelComponent.svelte'

	export let difficultyMode: DifficultyMode | undefined = undefined
	export let onSetDifficultyMode: (mode: DifficultyMode) => void = () => {}

	const difficultyModes = [
		{ id: adaptiveDifficultyId, getLabel: getAdaptiveDifficultyLabel },
		{ id: customAdaptiveDifficultyId, getLabel: getCustomDifficultyLabel }
	] as const

	function setDifficultyMode(mode: DifficultyMode) {
		difficultyMode = mode
		onSetDifficultyMode(mode)
	}
</script>

<div transition:slide={AppSettings.transitionDuration}>
	<PanelComponent heading={m.heading_difficulty()}>
		<fieldset>
			<legend class="sr-only">{m.heading_difficulty()}</legend>
			<div class="mb-1">
				{#each difficultyModes as option}
					<label for="l-{option.id}" class="flex items-center py-1">
						<input
							id="l-{option.id}"
							class="h-5 w-5 text-blue-700"
							type="radio"
							name="difficulty"
							value={option.id}
							bind:group={difficultyMode}
							on:change={() => setDifficultyMode(option.id)}
						/>
						<span class="ml-2 text-lg">{option.getLabel()}</span>
					</label>
				{/each}
			</div>
		</fieldset>
	</PanelComponent>
</div>
