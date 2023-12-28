<script lang="ts">
	import { slide } from 'svelte/transition'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import { AppSettings } from '../../models/constants/AppSettings'

	export let duration: number
	export let puzzleTimeLimit: boolean
	export let isDevEnvironment: boolean

	const durationValues = [0.5, 1, 3, 5]

	if (isDevEnvironment) {
		durationValues.push(480)
	}
</script>

<div transition:slide={AppSettings.transitionDuration}>
	<PanelComponent heading="Spilletid">
		{#each Object.values(durationValues) as d}
			<label class="flex items-center py-1">
				<input
					type="radio"
					class="h-5 w-5 text-blue-700"
					bind:group={duration}
					value={d}
				/>
				<span class="ml-2 text-lg"
					>{d === 0.5
						? '30 sekunder'
						: d === 1
							? `${d} minutt`
							: `${d} minutter`}</span
				>
			</label>
		{/each}
		<label class="mt-3 flex items-center py-1">
			<input
				type="checkbox"
				class="h-5 w-5 rounded text-blue-700"
				bind:checked={puzzleTimeLimit}
			/>
			<span class="ml-2 text-lg">Tidsbegrensning per oppgave</span>
		</label>
	</PanelComponent>
</div>
