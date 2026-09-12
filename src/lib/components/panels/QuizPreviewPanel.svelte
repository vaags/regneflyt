<script lang="ts">
	import { slide } from 'svelte/transition'
	import {
		alert_cannot_preview,
		button_new_example,
		dev_label_difficulty,
		dev_label_skill,
		dev_simulate_correct,
		dev_simulate_incorrect,
		heading_example
	} from '#lib/paraglide/messages.js'
	import { createInitialLoadSlideTransitionState } from '#lib/helpers/initialLoadTransitionState.svelte.ts'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import { AppSettings } from '#lib/constants/AppSettings.ts'
	import type { Puzzle } from '#lib/domain/puzzle-generation/puzzle.ts'
	import PuzzlePreviewComponent from '../widgets/PuzzlePreviewComponent.svelte'
	import AlertComponent from '../widgets/AlertComponent.svelte'
	import ButtonComponent from '../widgets/ButtonComponent.svelte'
	import RefreshComponent from '../icons/RefreshComponent.svelte'
	import type { PreviewSimulationOutcome } from '#lib/models/PreviewSimulation.ts'
	import type { OperatorSkillMap } from '#lib/domain/skill-progression/skillModel.ts'
	import { getPuzzleDifficulty } from '#lib/domain/puzzle-generation/puzzleDifficulty.ts'

	let {
		puzzle,
		validationError,
		isDevEnvironment = false,
		skillByOperator = [0, 0, 0, 0],
		onRefreshPreview = () => {},
		onSimulatePuzzlePreview = () => {}
	}: {
		puzzle: Puzzle | undefined
		validationError: boolean
		isDevEnvironment?: boolean
		skillByOperator?: OperatorSkillMap
		onRefreshPreview?: () => void
		onSimulatePuzzlePreview?: (outcome: PreviewSimulationOutcome) => void
	} = $props()

	const getSlideTransitionConfig = createInitialLoadSlideTransitionState(
		AppSettings.transitionDuration
	)
</script>

{#snippet panelLabelSnippet()}
	{#if isDevEnvironment && !validationError && puzzle}
		<div
			class="flex items-center justify-end gap-3 text-sm text-slate-800 tabular-nums dark:text-slate-300"
		>
			<span class="inline-flex items-center gap-1 whitespace-nowrap">
				<span>{dev_label_skill()}</span>
				<span class="inline-block w-[3ch] text-right"
					>{Math.round(skillByOperator[puzzle.operator])}</span
				>
				<span>%</span>
			</span>
			<span class="inline-flex items-center gap-1 whitespace-nowrap">
				<span>{dev_label_difficulty()}</span>
				<span class="inline-block w-[3ch] text-right"
					>{getPuzzleDifficulty(puzzle.operator, puzzle.parts)}</span
				>
			</span>
		</div>
	{/if}
{/snippet}

<div transition:slide={getSlideTransitionConfig()}>
	<PanelComponent
		heading={heading_example()}
		labelSnippet={panelLabelSnippet}
		stateKey="quiz-preview"
	>
		{#if validationError}
			<div transition:slide={getSlideTransitionConfig()}>
				<!-- Reflects menu configuration state, not a blocking error, so it
				     must not interrupt the screen reader. -->
				<AlertComponent
					color="yellow"
					announce={false}
					testId="quiz-preview-error">{alert_cannot_preview()}</AlertComponent
				>
			</div>
		{:else if puzzle}
			<div
				class="mx-auto mb-2 w-full max-w-[calc(13ch+3.75rem)] text-3xl md:text-4xl"
			>
				<div class="grid grid-cols-[minmax(0,1fr)_3.25rem] items-center gap-2">
					<div class="min-w-0 text-center">
						<PuzzlePreviewComponent {puzzle} />
					</div>
					<div class="flex justify-end">
						<ButtonComponent
							size="small"
							title={button_new_example()}
							ariaLabel={button_new_example()}
							onclick={onRefreshPreview}
						>
							<RefreshComponent />
						</ButtonComponent>
					</div>
				</div>
				<div class="mt-4 flex flex-wrap items-center justify-end gap-2">
					{#if isDevEnvironment}
						<ButtonComponent
							color="green"
							size="small"
							title={dev_simulate_correct()}
							ariaLabel={dev_simulate_correct()}
							onclick={() => onSimulatePuzzlePreview('correct')}
							>✓</ButtonComponent
						>
						<ButtonComponent
							color="red"
							size="small"
							title={dev_simulate_incorrect()}
							ariaLabel={dev_simulate_incorrect()}
							onclick={() => onSimulatePuzzlePreview('incorrect')}
							>✗</ButtonComponent
						>
					{/if}
				</div>
			</div>
		{/if}
	</PanelComponent>
</div>
