<script lang="ts">
	import { slide } from 'svelte/transition'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import { AppSettings } from '../../models/constants/AppSettings'
	import type { Puzzle } from '../../models/Puzzle'
	import PuzzlePreviewComponent from '../widgets/PuzzlePreviewComponent.svelte'
	import AlertComponent from '../widgets/AlertComponent.svelte'
	import ButtonComponent from '../widgets/ButtonComponent.svelte'
	import { previewSimulationOutcomes } from '../../models/constants/PreviewSimulation'
	import type { PreviewSimulationOutcome } from '../../models/constants/PreviewSimulation'
	import type { AdaptiveSkillMap } from '../../models/AdaptiveProfile'
	import { getPuzzleDifficulty } from '../../helpers/adaptiveHelper'

	export let puzzle: Puzzle
	export let validationError: boolean
	export let isDevEnvironment = false
	export let adaptiveSkillByOperator: AdaptiveSkillMap = [0, 0, 0, 0]
	export let onRefreshPreview: () => void = () => {}
	export let onSimulatePuzzlePreview: (
		outcome: PreviewSimulationOutcome
	) => void = () => {}
</script>

<div transition:slide={AppSettings.transitionDuration}>
	<PanelComponent heading="Eksempel">
		{#if validationError}
			<div class="mt-4" transition:slide={AppSettings.transitionDuration}>
				<AlertComponent color="yellow"
					>Kan ikke vise forhåndsvisning.</AlertComponent
				>
			</div>
		{:else}
			<div
				class="mb-1 grid grid-cols-[1fr_auto] items-center text-3xl md:text-4xl"
			>
				<div class="flex justify-center">
					<PuzzlePreviewComponent {puzzle} />
				</div>
				<div class="flex flex-col items-center gap-1">
					<ButtonComponent
						size="small"
						title="Nytt eksempel"
						on:click={onRefreshPreview}>↻</ButtonComponent
					>
					{#if isDevEnvironment}
						<ButtonComponent
							color="green"
							size="small"
							title="Simuler riktig svar"
							on:click={() =>
								onSimulatePuzzlePreview(previewSimulationOutcomes.correct)}
							>✓</ButtonComponent
						>
						<ButtonComponent
							color="red"
							size="small"
							title="Simuler feil svar"
							on:click={() =>
								onSimulatePuzzlePreview(previewSimulationOutcomes.incorrect)}
							>✗</ButtonComponent
						>
					{/if}
				</div>
			</div>
			{#if isDevEnvironment}
				<div class="mt-1 text-center text-slate-400">
					Skill: {Math.round(adaptiveSkillByOperator[puzzle.operator])}% ·
					Difficulty: {getPuzzleDifficulty(puzzle.operator, puzzle.parts)}
				</div>
			{/if}
		{/if}
	</PanelComponent>
</div>
