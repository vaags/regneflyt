<script lang="ts">
	import { PuzzleMode } from '#lib/domain/puzzle-generation/puzzleMode.ts'
	import {
		heading_puzzle_type,
		puzzle_mode_alternate,
		puzzle_mode_normal,
		puzzle_mode_random
	} from '#lib/paraglide/messages.js'
	import PanelComponent from '../widgets/PanelComponent.svelte'

	let {
		quizPuzzleMode,
		onQuizPuzzleModeChange
	}: {
		quizPuzzleMode: PuzzleMode
		onQuizPuzzleModeChange: (quizPuzzleMode: PuzzleMode) => void
	} = $props()
</script>

<PanelComponent heading={heading_puzzle_type()} stateKey="puzzle-type">
	<fieldset>
		<legend class="visually-hidden">{heading_puzzle_type()}</legend>
		{#each Object.values(PuzzleMode) as puzzleMode (puzzleMode)}
			<label class="option">
				<input
					type="radio"
					name="puzzleMode"
					data-testid="puzzle-mode-{puzzleMode}"
					checked={quizPuzzleMode === puzzleMode}
					onchange={() => onQuizPuzzleModeChange(puzzleMode)}
					value={puzzleMode}
				/>
				<span>
					{#if puzzleMode === PuzzleMode.Normal}
						{puzzle_mode_normal()}
					{:else if puzzleMode === PuzzleMode.Alternate}
						{puzzle_mode_alternate()}
					{:else}{puzzle_mode_random()}{/if}
				</span>
			</label>
		{/each}
	</fieldset>
</PanelComponent>

<style>
	.option {
		display: flex;
		align-items: center;
		min-block-size: var(--target-minimum);
		gap: 0.5rem;
		padding-block: 0.25rem;
		font-size: 1.125rem;
	}
</style>
