<script lang="ts">
	import { AppSettings } from '../../models/constants/AppSettings'
	import * as m from '$lib/paraglide/messages.js'

	export let heading: string

	let dialog: HTMLDialogElement
	let visible = false
	const duration = AppSettings.transitionDuration.duration

	export function open() {
		dialog.showModal()
		requestAnimationFrame(() => (visible = true))
	}

	function close() {
		visible = false
		setTimeout(() => dialog.close(), duration)
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === dialog) close()
	}
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<dialog
	bind:this={dialog}
	class="dialog panel-surface w-full max-w-md rounded-md p-0 opacity-0 ease-out"
	class:dialog-visible={visible}
	style="--duration: {duration}ms; transition: opacity var(--duration) ease-out, transform var(--duration) ease-out;"
	on:click={onBackdropClick}
	on:cancel|preventDefault={() => close()}
	on:keydown={(e) => {
		if (e.key === 'Escape') {
			e.preventDefault()
			close()
		}
	}}
>
	<div class="px-6 py-5 md:px-8 md:py-7">
		<div class="mb-5 flex items-center justify-between md:mb-6">
			<h2
				class="font-handwriting text-3xl text-gray-900 md:text-4xl dark:text-gray-300"
			>
				{heading}
			</h2>
			<button
				class="text-2xl text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
				on:click={close}
				aria-label={m.button_close()}
			>
				✕
			</button>
		</div>
		<slot />
	</div>
</dialog>

<style>
	.dialog {
		margin: auto;
		transform: scale(0.95) translateY(8px);
	}

	.dialog-visible {
		opacity: 1;
		transform: scale(1) translateY(0);
	}

	.dialog::backdrop {
		background: rgba(0, 0, 0, 0);
		transition: background var(--duration) ease-out;
	}

	.dialog-visible::backdrop {
		background: rgba(0, 0, 0, 0.5);
	}
</style>
