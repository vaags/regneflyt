<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte'
	import { fade } from 'svelte/transition'
	import PanelComponent from './widgets/PanelComponent.svelte'
	import TimeoutComponent from './widgets/TimeoutComponent.svelte'
	import { AppSettings } from '../models/constants/AppSettings'

	const dispatch = createEventDispatcher()

	let showComponent: boolean

	onMount(() => {
		setTimeout(() => {
			showComponent = true
		}, AppSettings.pageTransitionDuration.duration)
	})
</script>

{#if showComponent}
	<div transition:fade={AppSettings.pageTransitionDuration}>
		<PanelComponent heading="Tiden er ute&hellip;">
			<p class="my-16 animate-bounce text-center text-6xl font-light md:text-7xl">
				⌛
				<TimeoutComponent
					hidden={true}
					seconds={AppSettings.separatorPageDuration}
					fadeOnSecondChange={true}
					on:finished={() => dispatch('evaluateQuiz')}
				/>
			</p>
		</PanelComponent>
	</div>
{/if}
