<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import { slide } from 'svelte/transition'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import { AppSettings } from '../../models/constants/AppSettings'
	import type { Puzzle } from '../../models/Puzzle'
	import PuzzlePreviewComponent from '../widgets/PuzzlePreviewComponent.svelte'
	import AlertComponent from '../widgets/AlertComponent.svelte'
	import LabelComponent from '../widgets/LabelComponent.svelte'

	export let title: string | undefined
	export let puzzle: Puzzle
	export let validationError: boolean

	const dispatch = createEventDispatcher()
</script>

<div transition:slide|local={AppSettings.transitionDuration}>
	<div class="float-right mt-5 mr-5">
		<LabelComponent>Eksempel</LabelComponent>
	</div>
	<PanelComponent heading={title}>
		{#if validationError}
			<div class="mt-4" transition:slide|local={AppSettings.transitionDuration}>
				<AlertComponent color="yellow">Kan ikke vise forhåndsvisning.</AlertComponent>
			</div>
		{:else}
			<div class="mb-1 grid grid-cols-4 text-3xl md:text-4xl">
				<div />
				<div class="col-span-2 justify-self-center">
					<PuzzlePreviewComponent {puzzle} />
				</div>
				<div class="justify-self-end">
					<button
						type="button"
						class="border-1 flex cursor-pointer content-center rounded-md border border-blue-800 bg-white py-1 px-3 align-middle text-lg text-blue-900 md:text-xl"
						title="Nytt eksempel"
						on:click={() => dispatch('getPuzzlePreview')}
					>
						↻
					</button>
				</div>
			</div>
		{/if}
	</PanelComponent>
</div>
