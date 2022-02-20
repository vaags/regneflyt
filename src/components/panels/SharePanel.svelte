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
					class="rounded block text-lg mr-1"
					bind:value={shareTitle}
				/>
			</label>
			<button
				on:click|preventDefault={() => shareUrl()}
				class="py-2 px-3 border bg-white text-lg border-green-700 text-green-700 rounded-md hover:bg-green-700 hover:text-white transition-colors"
				>Del</button
			>
		</div>
	</PanelComponent>
</div>
