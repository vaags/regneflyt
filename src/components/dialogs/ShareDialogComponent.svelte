<script lang="ts">
	import DialogComponent from '../widgets/DialogComponent.svelte'
	import * as m from '$lib/paraglide/messages.js'
	import ButtonComponent from '../widgets/ButtonComponent.svelte'
	import { buildShareUrl } from '../../helpers/urlParamsHelper'

	let dialog = $state<DialogComponent>(undefined!)
	let titleDom = $state<HTMLInputElement>(undefined!)
	let shareTitle = $state('')

	async function shareUrl() {
		const shareData = {
			title: `${shareTitle} \u2013 ${m.app_title()}`,
			url: buildShareUrl(window.location.href, shareTitle)
		}

		try {
			await navigator.share(shareData)
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') return
			console.error('Share failed:', err)
		}
	}

	export function open() {
		dialog.open()
		requestAnimationFrame(() => titleDom?.focus())
	}
</script>

<DialogComponent bind:this={dialog} heading={m.heading_sharing()}>
	<label for="share-title" class="mb-1 block text-lg">{m.label_title()}</label>
	<div class="flex items-center">
		<input
			id="share-title"
			type="text"
			maxlength="50"
			bind:this={titleDom}
			class="mr-1 block rounded text-lg"
			bind:value={shareTitle}
		/>
		<ButtonComponent variant="outlined" onclick={() => shareUrl()}
			>{m.button_share()}</ButtonComponent
		>
	</div>
</DialogComponent>
