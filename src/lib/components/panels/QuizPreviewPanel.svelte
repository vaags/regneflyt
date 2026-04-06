<script lang="ts">
	import { slide } from 'svelte/transition'
	import {
		alert_cannot_preview,
		button_new_example,
		dev_simulate_correct,
		dev_simulate_incorrect,
		heading_example
	} from '$lib/paraglide/messages.js'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import { AppSettings } from '$lib/constants/AppSettings'
	import type { Puzzle } from '$lib/models/Puzzle'
	import PuzzlePreviewComponent from '../widgets/PuzzlePreviewComponent.svelte'
	import AlertComponent from '../widgets/AlertComponent.svelte'
	import ButtonComponent from '../widgets/ButtonComponent.svelte'
	import type { PreviewSimulationOutcome } from '$lib/constants/PreviewSimulation'
	import type { AdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
	import { getPuzzleDifficulty } from '$lib/helpers/adaptiveHelper'

	let {
		puzzle,
		validationError,
		isDevEnvironment = false,
		adaptiveSkillByOperator = [0, 0, 0, 0],
		onRefreshPreview = () => {},
		onSimulatePuzzlePreview = () => {}
	}: {
		puzzle: Puzzle | undefined
		validationError: boolean
		isDevEnvironment?: boolean
		adaptiveSkillByOperator?: AdaptiveSkillMap
		onRefreshPreview?: () => void
		onSimulatePuzzlePreview?: (outcome: PreviewSimulationOutcome) => void
	} = $props()
</script>

{#snippet panelLabelSnippet()}
	{#if isDevEnvironment && !validationError && puzzle}
		<div
			class="flex items-center justify-end gap-3 text-sm text-slate-800 tabular-nums dark:text-slate-300"
		>
			<span class="inline-flex items-center gap-1 whitespace-nowrap">
				<span>Skill:</span>
				<span class="inline-block w-[3ch] text-right"
					>{Math.round(adaptiveSkillByOperator[puzzle.operator])}</span
				>
				<span>%</span>
			</span>
			<span class="inline-flex items-center gap-1 whitespace-nowrap">
				<span>Difficulty:</span>
				<span class="inline-block w-[3ch] text-right"
					>{getPuzzleDifficulty(puzzle.operator, puzzle.parts)}</span
				>
			</span>
		</div>
	{/if}
{/snippet}

<div transition:slide={AppSettings.transitionDuration}>
	<PanelComponent heading={heading_example()} labelSnippet={panelLabelSnippet}>
		{#if validationError}
			<div transition:slide={AppSettings.transitionDuration}>
				<AlertComponent color="yellow">{alert_cannot_preview()}</AlertComponent>
			</div>
		{:else if puzzle}
			<div class="mb-2 text-3xl md:text-4xl">
				<div class="flex justify-center">
					<PuzzlePreviewComponent {puzzle} />
				</div>
			</div>
			<div class="mt-4 flex flex-wrap items-center justify-center gap-2">
				<ButtonComponent
					size="small"
					title={button_new_example()}
					onclick={onRefreshPreview}
				>
					<span class="inline-flex items-center gap-2">
						<span aria-hidden="true">↻</span>
						<span>{button_new_example()}</span>
					</span>
				</ButtonComponent>
				{#if isDevEnvironment}
					<ButtonComponent
						color="green"
						size="small"
						title={dev_simulate_correct()}
						onclick={() => onSimulatePuzzlePreview('correct')}
						>✓</ButtonComponent
					>
					<ButtonComponent
						color="red"
						size="small"
						title={dev_simulate_incorrect()}
						onclick={() => onSimulatePuzzlePreview('incorrect')}
						>✗</ButtonComponent
					>
				{/if}
			</div>
		{/if}
	</PanelComponent>
</div>
