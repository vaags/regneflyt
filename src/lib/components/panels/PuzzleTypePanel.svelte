<script lang="ts">
	import { PuzzleMode } from '$lib/constants/PuzzleMode'
	import {
		heading_puzzle_type,
		puzzle_mode_alternate,
		puzzle_mode_normal,
		puzzle_mode_random
	} from '$lib/paraglide/messages.js'
	import PanelComponent from '../widgets/PanelComponent.svelte'

	let {
		quizPuzzleMode,
		onQuizPuzzleModeChange
	}: {
		quizPuzzleMode: PuzzleMode
		onQuizPuzzleModeChange: (quizPuzzleMode: PuzzleMode) => void
	} = $props()
</script>

<PanelComponent heading={heading_puzzle_type()}>
	<fieldset>
		<legend class="sr-only">{heading_puzzle_type()}</legend>
		{#each Object.values(PuzzleMode) as puzzleMode (puzzleMode)}
			<label class="flex items-center py-1 text-lg">
				<input
					type="radio"
					class="mr-2 h-5 w-5"
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
