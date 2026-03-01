<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import { slide } from 'svelte/transition'
	import { AppSettings } from '../../models/constants/AppSettings'
	import {
		adaptiveDifficultyId,
		customAdaptiveDifficultyId,
		type DifficultyMode
	} from '../../models/AdaptiveProfile'
	import PanelComponent from '../widgets/PanelComponent.svelte'

	export let difficultyMode: DifficultyMode | undefined = undefined

	const dispatch = createEventDispatcher<{
		setDifficultyMode: { mode: DifficultyMode }
	}>()
	const difficultyModes = [
		{ id: adaptiveDifficultyId, label: 'Adaptiv' },
		{ id: customAdaptiveDifficultyId, label: 'Egendefinert' }
	] as const satisfies readonly { id: DifficultyMode; label: string }[]

	function setDifficultyMode(mode: DifficultyMode) {
		difficultyMode = mode
		dispatch('setDifficultyMode', { mode })
	}
</script>

<div transition:slide={AppSettings.transitionDuration}>
	<PanelComponent heading="Vanskelighetsgrad">
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
					<span class="ml-2 text-lg">{option.label}</span>
				</label>
			{/each}
		</div>
	</PanelComponent>
</div>
