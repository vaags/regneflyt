<script lang="ts">
	import { slide } from 'svelte/transition'
	import {
		duration_30_seconds,
		duration_minute,
		duration_minutes,
		duration_unlimited,
		heading_play_time,
		label_progressbar
	} from '#lib/paraglide/messages.js'
	import { createInitialLoadSlideTransitionState } from '#lib/helpers/initialLoadTransitionState.svelte.ts'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import { AppSettings } from '#lib/constants/AppSettings.ts'

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

	const getSlideTransitionConfig = createInitialLoadSlideTransitionState(
		AppSettings.transitionDuration
	)
</script>

<div transition:slide={getSlideTransitionConfig()}>
	<PanelComponent heading={heading_play_time()} stateKey="quiz-duration">
		<fieldset>
			<legend class="visually-hidden">{heading_play_time()}</legend>
			{#each durationValues as d (d)}
				<label class="option">
					<input
						type="radio"
						data-testid={`duration-${d}`}
						name="duration"
						checked={duration === d}
						onchange={() => updateDuration(d)}
						value={d}
					/>
					<span>{getDurationLabel(d)}</span>
				</label>
			{/each}
		</fieldset>
		<label class="option option--separated">
			<input
				type="checkbox"
				data-testid="toggle-progress-bar"
				checked={showPuzzleProgressBar}
				onchange={(e) => updateShowPuzzleProgressBar(e.currentTarget.checked)}
			/>
			<span>{label_progressbar()}</span>
		</label>
	</PanelComponent>
</div>

<style>
	.option {
		display: flex;
		align-items: center;
		min-block-size: var(--target-minimum);
		gap: 0.5rem;
		padding-block: 0.25rem;
		font-size: 1.125rem;
	}

	.option--separated {
		margin-block-start: 0.75rem;
	}
</style>
