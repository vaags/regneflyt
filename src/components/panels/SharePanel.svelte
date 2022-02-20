<script lang="ts">
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import { slide } from 'svelte/transition'
	import { onMount } from 'svelte'
	import type { TransitionDuration } from '../../models/TransitionDuration'
	import ButtonComponent from '../widgets/ButtonComponent.svelte'

	export let transitionDuration: TransitionDuration

	let titleDom: any
	let shareTitle: string

	async function shareUrl() {
		const shareData = {
			title: `${shareTitle} - Regneflyt`,
			text: 'Tren hoderegning med Regneflyt!',
			url: `${window.location.protocol}//${window.location.host}${window.location.pathname}${
				window.location.search
			}&title=${encodeURIComponent(shareTitle)}&showSettings=false`
		}

		try {
			await navigator.share(shareData)
			console.log('shared successfully')
		} catch (err) {
			console.log('Error: ' + err)
		}
	}

	function scrollToBottom() {
		window.scrollTo({
			top: document.body.scrollHeight,
			left: 0,
			behavior: 'smooth'
		})
	}

	onMount(() => {
		titleDom.focus()
	})
</script>

<div transition:slide|local={transitionDuration} on:introend={() => scrollToBottom()} id="share">
	<PanelComponent heading="Deling">
		<div class="flex items-end">
			<label class="text-lg"
				>Tittel
				<input
					type="text"
					maxlength="50"
					bind:this={titleDom}
					class="rounded block text-lg"
					bind:value={shareTitle}
				/>
			</label>
			<button
				on:click|preventDefault={() => shareUrl()}
				class="ml-1 py-2 px-4 border font-semibold bg-white text-lg border-blue-700 text-blue-700 rounded-md hover:bg-blue-700 hover:text-white transition-colors"
				>Del</button
			>
		</div>
	</PanelComponent>
</div>
