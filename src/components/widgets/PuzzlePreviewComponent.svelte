<script lang="ts">
	import type { Puzzle } from '../../models/Puzzle'
	import { getOperatorSign } from '../../models/constants/Operator'
	import HiddenValueComponent from './HiddenValueComponent.svelte'
	import TweenedValueComponent from './TweenedValueComponent.svelte'

	export let puzzle: Puzzle

	let showHiddenValue: boolean = false
</script>

{#each puzzle.parts as part, i}
	{#if puzzle.unknownPuzzlePart === i}
		<HiddenValueComponent
			hiddenValue={part.generatedValue}
			{showHiddenValue}
			value="?"
			interactive={true}
			on:click={() => (showHiddenValue = !showHiddenValue)}
		/>
	{:else}
		<TweenedValueComponent value={part.generatedValue} />
	{/if}
	{#if i === 0}
		<span class="mr-2">
			{getOperatorSign(puzzle.operator)}
		</span>
	{:else if i === 1}<span class="mr-2">=</span>{/if}
{/each}
