<script lang="ts">
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import { slide } from 'svelte/transition'
	import { onMount } from 'svelte'
	import * as m from '$lib/paraglide/messages.js'
	import { AppSettings } from '../../models/constants/AppSettings'
	import ButtonOutlined from '../widgets/ButtonOutlinedComponent.svelte'

	let titleDom = $state<HTMLElement>(undefined!)
	let shareTitle = $state('')

	async function shareUrl() {
		const shareData = {
			title: `${shareTitle} \u2013 ${m.app_title()}`,
			text: m.share_text(),
			url: `${window.location.protocol}//${window.location.host}${
				window.location.pathname
			}${window.location.search}&title=${encodeURIComponent(
				shareTitle
			)}&showSettings=false`
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
	onintroend={() => scrollToBottom()}
	id="share"
>
	<PanelComponent heading={m.heading_sharing()}>
		<label for="share-title" class="mb-1 block text-lg">{m.label_title()}</label
		>
		<div class="flex items-center">
			<input
				id="share-title"
				type="text"
				maxlength="50"
				bind:this={titleDom}
				class="mr-1 block rounded text-lg"
				bind:value={shareTitle}
			/>
			<ButtonOutlined onclick={() => shareUrl()}
				>{m.button_share()}</ButtonOutlined
			>
		</div>
	</PanelComponent>
</div>
