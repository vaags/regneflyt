<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import { slide } from 'svelte/transition'
	import { AppSettings } from '../../models/constants/AppSettings'
	import PanelComponent from '../widgets/PanelComponent.svelte'

	export let level: number | undefined = undefined

	const dispatch = createEventDispatcher()
	const levels = [1, 2, 3, 4, 5, 6, 0]

	function setDifficultyLevel(selectedLevel: number | undefined) {
		level = selectedLevel
		dispatch('setDifficultyLevel', { level })
	}
</script>

<div transition:slide|local={AppSettings.transitionDuration}>
	<PanelComponent heading="Vanskelighetsgrad">
		<div
			class="mb-1 flex flex-wrap divide-x divide-gray-500 overflow-hidden rounded border border-gray-500 bg-white text-lg"
		>
			{#each levels as l, i}
				<input
					id="l-{l}"
					class="sr-only"
					type="radio"
					name="difficulty"
					value={l}
					bind:group={level}
					on:change={() => setDifficultyLevel(l)}
				/>
				<label
					for="l-{l}"
					style={i == 0 ? 'border: 0' : ''}
					class="flex-1 
                    cursor-pointer py-2 text-center transition-all duration-200
                    {level === l && 'bg-blue-700 text-gray-100'}"
				>
					{l === 0 ? '?' : l}
				</label>
			{/each}
		</div>
	</PanelComponent>
</div>

<style>
	input[type='radio']:focus + label {
		@apply ring-2;
		@apply ring-blue-300;
		@apply ring-inset;
	}
</style>
