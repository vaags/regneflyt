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
		<div class="preview-metadata">
			<span class="metric">
				<span>{dev_label_skill()}</span>
				<span class="metric-value"
					>{Math.round(skillByOperator[puzzle.operator])}</span
				>
				<span>%</span>
			</span>
			<span class="metric">
				<span>{dev_label_difficulty()}</span>
				<span class="metric-value"
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
			<div class="preview">
				<div class="row">
					<div class="puzzle">
						<PuzzlePreviewComponent {puzzle} />
					</div>
					<div class="refresh">
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
				<div class="simulation-actions">
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

<style>
	.preview-metadata {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.75rem;
		color: #1e293b;
		font-size: 0.875rem;
		font-variant-numeric: tabular-nums;

		& .metric {
			display: inline-flex;
			align-items: center;
			gap: 0.25rem;
			white-space: nowrap;
		}

		& .metric-value {
			display: inline-block;
			inline-size: 3ch;
			text-align: end;
		}
	}

	.preview {
		inline-size: 100%;
		max-inline-size: calc(13ch + 3.75rem);
		margin: 0 auto 0.5rem;
		font-size: 1.875rem;

		& .row {
			display: grid;
			grid-template-columns: minmax(0, 1fr) 3.25rem;
			align-items: center;
			gap: 0.5rem;
		}

		& .puzzle {
			min-inline-size: 0;
			text-align: center;
		}

		& .refresh,
		& .simulation-actions {
			display: flex;
			justify-content: flex-end;
		}

		& .simulation-actions {
			align-items: center;
			flex-wrap: wrap;
			gap: 0.5rem;
			margin-block-start: 1rem;
		}
	}

	:global(.dark) .preview-metadata {
		color: #cbd5e1;
	}

	@media (min-width: 48rem) {
		.preview {
			font-size: 2.25rem;
		}
	}
</style>
