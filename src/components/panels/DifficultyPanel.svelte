<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import { slide } from 'svelte/transition'
	import { AppSettings } from '../../models/constants/AppSettings'
	import PanelComponent from '../widgets/PanelComponent.svelte'

	export let level: number | undefined = undefined

	const dispatch = createEventDispatcher()
	const levels = [1, 2, 3, 4, 5, 6, 0]

	function setDifficultyLevel(selectedLevel: number) {
		level = selectedLevel
		dispatch('setDifficultyLevel', { level })
	}
</script>

<div transition:slide={AppSettings.transitionDuration}>
	<PanelComponent heading="Vanskelighetsgrad">
		<div
			class="mb-1 flex flex-wrap divide-x divide-gray-400 overflow-hidden rounded border border-gray-400 bg-white text-lg text-gray-900 dark:divide-gray-400 dark:border-gray-400 dark:bg-gray-700 dark:text-gray-100"
		>
			{#each levels as l, i}
				<label
					for="l-{l}"
					class="flex-1 cursor-pointer py-2 text-center
                    transition-all duration-200
                    {level === l
						? 'bg-blue-700 text-gray-100 focus-within:ring-2 focus-within:ring-blue-300 focus-within:ring-inset'
						: 'hover:bg-gray-100 dark:hover:bg-gray-600'}"
				>
					{l === 0 ? '?' : l}
					<input
						id="l-{l}"
						class="sr-only"
						type="radio"
						name="difficulty"
						value={l}
						bind:group={level}
						on:change={() => setDifficultyLevel(l)}
					/>
				</label>
			{/each}
		</div>
	</PanelComponent>
</div>
