<script lang="ts">
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import { slide } from 'svelte/transition'
	import { onMount } from 'svelte'
	import { AppSettings } from '../../models/constants/AppSettings'
	import ButtonOutlined from '../widgets/ButtonOutlinedComponent.svelte'

	let titleDom: HTMLElement
	let shareTitle: string

	async function shareUrl() {
		const shareData = {
			title: `${shareTitle} &ndash; Regneflyt`,
			text: 'Tren hoderegning med Regneflyt!',
			url: `${window.location.protocol}//${window.location.host}${window.location.pathname}${
				window.location.search
			}&title=${encodeURIComponent(shareTitle)}&showSettings=false`
		}

		try {
			await navigator.share(shareData)
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
	transition:slide={AppSettings.transitionDuration}
	on:introend={() => scrollToBottom()}
	id="share"
>
	<PanelComponent heading="Deling">
		<div class="flex items-end">
			<label class="mr-1 text-lg"
				>Tittel
				<input
					type="text"
					maxlength="50"
					bind:this={titleDom}
					class="block rounded text-lg"
					bind:value={shareTitle}
				/>
			</label>
			<ButtonOutlined on:click={() => shareUrl()}>Del</ButtonOutlined>
		</div>
	</PanelComponent>
</div>
