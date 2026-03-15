<script lang="ts">
	import { PuzzleMode } from '$lib/constants/PuzzleMode'
	import * as m from '$lib/paraglide/messages.js'
	import PanelComponent from '../widgets/PanelComponent.svelte'

	let { quizPuzzleMode = $bindable() }: { quizPuzzleMode: PuzzleMode } =
		$props()
</script>

<PanelComponent heading={m.heading_puzzle_type()}>
	<fieldset>
		<legend class="sr-only">{m.heading_puzzle_type()}</legend>
		{#each Object.values(PuzzleMode) as puzzleMode}
			<label class="flex items-center py-1 text-lg">
				<input
					type="radio"
					class="mr-2 h-5 w-5 text-sky-700"
					name="puzzleMode"
					data-testid="puzzle-mode-{puzzleMode}"
					checked={quizPuzzleMode === puzzleMode}
					onchange={() => (quizPuzzleMode = puzzleMode)}
					value={puzzleMode}
				/>
				<span>
					{#if puzzleMode === PuzzleMode.Normal}
						{m.puzzle_mode_normal()}
					{:else if puzzleMode === PuzzleMode.Alternate}
						{m.puzzle_mode_alternate()}
					{:else}{m.puzzle_mode_random()}{/if}
				</span>
			</label>
		{/each}
	</fieldset>
</PanelComponent>
