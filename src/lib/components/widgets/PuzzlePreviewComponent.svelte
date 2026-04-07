<script lang="ts">
	import type { Puzzle } from '$lib/models/Puzzle'
	import { getOperatorSign } from '$lib/constants/Operator'
	import HiddenValueComponent from './HiddenValueComponent.svelte'
	import TweenedValueComponent from './TweenedValueComponent.svelte'

	let { puzzle }: { puzzle: Puzzle } = $props()

	let showHiddenValue = $state(false)
</script>

{#each puzzle.parts as part, i (i)}
	{#if puzzle.unknownPartIndex === i}
		<HiddenValueComponent
			hiddenValue={part.generatedValue}
			bind:showHiddenValue
			value="?"
			interactive={true}
		/>
	{:else}
		<TweenedValueComponent value={part.generatedValue} />
	{/if}
	{#if i === 0}
		<span class="mx-2">
			{getOperatorSign(puzzle.operator)}
		</span>
	{:else if i === 1}<span class="mx-2">=</span>{/if}
{/each}
