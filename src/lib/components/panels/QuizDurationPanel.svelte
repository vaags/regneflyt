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
	import {
		getInitialLoadTransitionConfig,
		setupInitialLoadTransitionGate,
		shouldAllowInitialTransitions
	} from '$lib/helpers/initialLoadTransitionHelper'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import { AppSettings } from '$lib/constants/AppSettings'

	let {
		duration,
		showPuzzleProgressBar,
		onDurationSettingsChange,
		isDevEnvironment
	}: {
		duration: number
		showPuzzleProgressBar: boolean
		onDurationSettingsChange: (settings: {
			duration: number
			showPuzzleProgressBar: boolean
		}) => void
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

	function updateDuration(nextDuration: number) {
		onDurationSettingsChange({
			duration: nextDuration,
			showPuzzleProgressBar
		})
	}

	function updateShowPuzzleProgressBar(nextShowPuzzleProgressBar: boolean) {
		onDurationSettingsChange({
			duration,
			showPuzzleProgressBar: nextShowPuzzleProgressBar
		})
	}

	let allowInitialTransitions = $state(shouldAllowInitialTransitions())
	let slideTransitionConfig = $derived(
		getInitialLoadTransitionConfig(
			allowInitialTransitions,
			AppSettings.transitionDuration
		)
	)

	setupInitialLoadTransitionGate(
		() => allowInitialTransitions,
		() => {
			allowInitialTransitions = true
		}
	)
</script>

<div transition:slide={slideTransitionConfig}>
	<PanelComponent heading={heading_play_time()}>
		<fieldset>
			<legend class="sr-only">{heading_play_time()}</legend>
			{#each durationValues as d (d)}
				<label class="flex items-center py-1">
					<input
						type="radio"
						class="form-radio h-5 w-5 text-sky-700"
						name="duration"
						checked={duration === d}
						onchange={() => updateDuration(d)}
						value={d}
					/>
					<span class="ml-2 text-lg">{getDurationLabel(d)}</span>
				</label>
			{/each}
		</fieldset>
		<label class="mt-3 flex items-center py-1">
			<input
				type="checkbox"
				class="form-checkbox h-5 w-5 rounded text-sky-700"
				checked={showPuzzleProgressBar}
				onchange={(e) =>
					updateShowPuzzleProgressBar(
						(e.currentTarget as HTMLInputElement).checked
					)}
			/>
			<span class="ml-2 text-lg">{label_progressbar()}</span>
		</label>
	</PanelComponent>
</div>
