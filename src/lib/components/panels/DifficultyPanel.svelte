<script lang="ts">
	import { slide } from 'svelte/transition'
	import { AppSettings } from '#lib/constants/AppSettings.ts'
	import {
		difficulty_adaptive,
		difficulty_custom,
		heading_difficulty
	} from '#lib/paraglide/messages.js'
	import {
		adaptiveDifficultyId,
		customDifficultyId,
		type DifficultyMode
	} from '#lib/domain/skill-progression/difficultyMode.ts'
	import { createInitialLoadSlideTransitionState } from '#lib/helpers/initialLoadTransitionState.svelte.ts'
	import PanelComponent from '../widgets/PanelComponent.svelte'

	let {
		difficultyMode = undefined,
		onSetDifficultyMode = () => {}
	}: {
		difficultyMode?: DifficultyMode | undefined
		onSetDifficultyMode?: (mode: DifficultyMode, focusTargetId: string) => void
	} = $props()

	const difficultyModes = [
		{ id: adaptiveDifficultyId, getLabel: () => difficulty_adaptive() },
		{ id: customDifficultyId, getLabel: () => difficulty_custom() }
	] as const

	const getSlideTransitionConfig = createInitialLoadSlideTransitionState(
		AppSettings.transitionDuration
	)
</script>

<div transition:slide={getSlideTransitionConfig()}>
	<PanelComponent heading={heading_difficulty()} stateKey="difficulty">
		<fieldset>
			<legend class="visually-hidden">{heading_difficulty()}</legend>
			<div class="options">
				{#each difficultyModes as option (option.id)}
					<label for="l-{option.id}" class="option">
						<input
							id="l-{option.id}"
							type="radio"
							name="difficulty"
							data-testid="difficulty-{option.id}"
							value={option.id}
							checked={difficultyMode === option.id}
							onchange={() => onSetDifficultyMode(option.id, `l-${option.id}`)}
						/>
						<span>{option.getLabel()}</span>
					</label>
				{/each}
			</div>
		</fieldset>
	</PanelComponent>
</div>

<style>
	.options {
		margin-block-end: 0.25rem;
	}

	.option {
		display: flex;
		align-items: center;
		min-block-size: var(--target-minimum);
		gap: 0.5rem;
		padding-block: 0.25rem;
		font-size: 1.125rem;
	}
</style>
