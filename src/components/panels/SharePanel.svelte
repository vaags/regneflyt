<script lang="ts">
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import { slide } from 'svelte/transition'
	import { onMount } from 'svelte'
	import { AppSettings } from '../../models/constants/AppSettings'

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

<div
	transition:slide|local={AppSettings.transitionDuration}
	on:introend={() => scrollToBottom()}
	id="share"
>
	<PanelComponent heading="Deling">
		<div class="flex items-end">
			<label class="text-lg"
				>Tittel
				<input
					type="text"
					maxlength="50"
					bind:this={titleDom}
					class="block rounded text-lg"
					bind:value={shareTitle}
				/>
			</label>
			<button
				on:click|preventDefault={() => shareUrl()}
				class="ml-1 rounded-md border border-blue-700 bg-white py-2 px-4 text-lg font-semibold text-blue-700 transition-colors hover:bg-blue-700 hover:text-white"
				>Del</button
			>
		</div>
	</PanelComponent>
</div>
