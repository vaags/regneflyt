<script lang="ts">
	import { slide } from 'svelte/transition'
	import { AppSettings } from '../../models/constants/AppSettings'

	export let color: 'red' | 'blue' | 'yellow' = 'blue'
	export let dismissable = false

	let visible = true
</script>

{#if visible}
	<div class="relative" transition:slide={AppSettings.transitionDuration}>
		<p class="border-l-4 p-4 alert-{color} text-lg" role="alert">
			<slot />
			{#if dismissable}
				<button
					class="absolute top-1 right-1.5 p-1 leading-none text-current opacity-60 transition-opacity hover:opacity-100"
					aria-label="Lukk"
					on:click={() => (visible = false)}>&times;</button
				>
			{/if}
		</p>
	</div>
{/if}
