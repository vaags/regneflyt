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
		{ id: customAdaptiveDifficultyId, label: 'Egendefinert adaptiv' }
	] as const satisfies readonly { id: DifficultyMode; label: string }[]

	function setDifficultyMode(mode: DifficultyMode) {
		difficultyMode = mode
		dispatch('setDifficultyMode', { mode })
	}
</script>

<div transition:slide={AppSettings.transitionDuration}>
	<PanelComponent heading="Vanskelighetsgrad">
		<div
			class="mb-1 flex flex-wrap divide-x divide-gray-400 overflow-hidden rounded border border-gray-400 bg-white text-base text-gray-900 md:text-lg dark:divide-gray-400 dark:border-gray-400 dark:bg-gray-700 dark:text-gray-100"
		>
			{#each difficultyModes as option}
				<label
					for="l-{option.id}"
					class="flex-1 cursor-pointer py-2 text-center
                    transition-all duration-200
					{difficultyMode === option.id
						? 'bg-blue-700 text-gray-100 focus-within:ring-2 focus-within:ring-blue-300 focus-within:ring-inset'
						: 'hover:bg-gray-100 dark:hover:bg-gray-600'}"
				>
					{option.label}
					<input
						id="l-{option.id}"
						class="sr-only"
						type="radio"
						name="difficulty"
						value={option.id}
						bind:group={difficultyMode}
						on:change={() => setDifficultyMode(option.id)}
					/>
				</label>
			{/each}
		</div>
	</PanelComponent>
</div>
