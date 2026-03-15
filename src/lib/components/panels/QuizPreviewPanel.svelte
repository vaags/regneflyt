<script lang="ts">
	import { slide } from 'svelte/transition'
	import * as m from '$lib/paraglide/messages.js'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import { AppSettings } from '$lib/constants/AppSettings'
	import type { Puzzle } from '$lib/models/Puzzle'
	import PuzzlePreviewComponent from '../widgets/PuzzlePreviewComponent.svelte'
	import AlertComponent from '../widgets/AlertComponent.svelte'
	import ButtonComponent from '../widgets/ButtonComponent.svelte'
	import { previewSimulationOutcomes } from '$lib/constants/PreviewSimulation'
	import type { PreviewSimulationOutcome } from '$lib/constants/PreviewSimulation'
	import type { AdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
	import { getPuzzleDifficulty } from '$lib/helpers/adaptiveHelper'

	let {
		puzzle,
		validationError,
		title = undefined,
		isDevEnvironment = false,
		adaptiveSkillByOperator = [0, 0, 0, 0],
		onRefreshPreview = () => {},
		onSimulatePuzzlePreview = () => {}
	}: {
		puzzle: Puzzle
		validationError: boolean
		title?: string | undefined
		isDevEnvironment?: boolean
		adaptiveSkillByOperator?: AdaptiveSkillMap
		onRefreshPreview?: () => void
		onSimulatePuzzlePreview?: (outcome: PreviewSimulationOutcome) => void
	} = $props()
</script>

<div transition:slide={AppSettings.transitionDuration}>
	<PanelComponent
		heading={title ?? m.heading_example()}
		label={title ? m.heading_example() : undefined}
	>
		{#if validationError}
			<div class="mt-4" transition:slide={AppSettings.transitionDuration}>
				<AlertComponent color="yellow"
					>{m.alert_cannot_preview()}</AlertComponent
				>
			</div>
		{:else if puzzle}
			<div
				class="mb-1 grid grid-cols-[1fr_auto] items-center text-3xl md:text-4xl"
			>
				<div class="flex justify-center">
					<PuzzlePreviewComponent {puzzle} />
				</div>
				<div class="flex flex-col items-center gap-1">
					<ButtonComponent
						size="small"
						title={m.button_new_example()}
						onclick={onRefreshPreview}>↻</ButtonComponent
					>
					{#if isDevEnvironment}
						<ButtonComponent
							color="green"
							size="small"
							title={m.dev_simulate_correct()}
							onclick={() =>
								onSimulatePuzzlePreview(previewSimulationOutcomes.correct)}
							>✓</ButtonComponent
						>
						<ButtonComponent
							color="red"
							size="small"
							title={m.dev_simulate_incorrect()}
							onclick={() =>
								onSimulatePuzzlePreview(previewSimulationOutcomes.incorrect)}
							>✗</ButtonComponent
						>
					{/if}
				</div>
			</div>
			{#if isDevEnvironment}
				<div
					class="dark:text mt-1 text-center text-slate-800 dark:text-slate-300"
				>
					Skill: {Math.round(adaptiveSkillByOperator[puzzle.operator])}% ·
					Difficulty: {getPuzzleDifficulty(puzzle.operator, puzzle.parts)}
				</div>
			{/if}
		{/if}
	</PanelComponent>
</div>
