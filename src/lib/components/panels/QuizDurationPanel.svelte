<script lang="ts">
	import { slide } from 'svelte/transition'
	import {
		duration_30_seconds,
		duration_minute,
		duration_minutes,
		duration_unlimited,
		heading_play_time,
		label_progressbar
	} from '$lib/paraglide/messages.js'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import { AppSettings } from '$lib/constants/AppSettings'

	let {
		duration,
		showPuzzleProgressBar,
		onDurationChange,
		onShowPuzzleProgressBarChange,
		isDevEnvironment
	}: {
		duration: number
		showPuzzleProgressBar: boolean
		onDurationChange: (duration: number) => void
		onShowPuzzleProgressBarChange: (showPuzzleProgressBar: boolean) => void
		isDevEnvironment: boolean
	} = $props()

	let durationValues = $derived.by(() => {
		const values = [0.5, 1, 3, 5, 0]
		if (isDevEnvironment) values.push(0.1, 480)
		return values
	})

	function getDurationLabel(d: number): string {
		if (d === 0) return duration_unlimited()
		if (d === 0.5) return duration_30_seconds()
		if (d === 1) return duration_minute({ d })
		return duration_minutes({ d })
	}
</script>

<div transition:slide={AppSettings.transitionDuration}>
	<PanelComponent heading={heading_play_time()}>
		<fieldset>
			<legend class="sr-only">{heading_play_time()}</legend>
			{#each durationValues as d}
				<label class="flex items-center py-1">
					<input
						type="radio"
						class="h-5 w-5 text-sky-700"
						name="duration"
						checked={duration === d}
						onchange={() => onDurationChange(d)}
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
				checked={showPuzzleProgressBar}
				onchange={(e) =>
					onShowPuzzleProgressBarChange(
						(e.currentTarget as HTMLInputElement).checked
					)}
			/>
			<span class="ml-2 text-lg">{label_progressbar()}</span>
		</label>
	</PanelComponent>
</div>
