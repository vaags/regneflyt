<script lang="ts">
	import { untrack } from 'svelte'
	import { slide } from 'svelte/transition'
	import * as m from '$lib/paraglide/messages.js'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import { AppSettings } from '$lib/constants/AppSettings'

	let {
		duration = $bindable(),
		showPuzzleProgressBar = $bindable(),
		isDevEnvironment
	}: {
		duration: number
		showPuzzleProgressBar: boolean
		isDevEnvironment: boolean
	} = $props()

	const durationValues = [0.5, 1, 3, 5, 0]

	if (untrack(() => isDevEnvironment)) {
		durationValues.push(0.1, 480)
	}

	function getDurationLabel(d: number): string {
		if (d === 0) return m.duration_unlimited()
		if (d === 0.5) return m.duration_30_seconds()
		if (d === 1) return m.duration_minute({ d })
		return m.duration_minutes({ d })
	}
</script>

<div transition:slide={AppSettings.transitionDuration}>
	<PanelComponent heading={m.heading_play_time()}>
		<fieldset>
			<legend class="sr-only">{m.heading_play_time()}</legend>
			{#each durationValues as d}
				<label class="flex items-center py-1">
					<input
						type="radio"
						class="h-5 w-5 text-sky-700"
						name="duration"
						checked={duration === d}
						onchange={() => (duration = d)}
						value={d}
					/>
					<span class="ml-2 text-lg">{getDurationLabel(d)}</span>
				</label>
			{/each}
		</fieldset>
		<label class="mt-3 flex items-center py-1">
			<input
				type="checkbox"
				class="h-5 w-5 rounded text-sky-700"
				bind:checked={showPuzzleProgressBar}
			/>
			<span class="ml-2 text-lg">{m.label_progressbar()}</span>
		</label>
	</PanelComponent>
</div>
