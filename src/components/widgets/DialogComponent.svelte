<script lang="ts">
	import type { Snippet } from 'svelte'
	import { AppSettings } from '../../models/constants/AppSettings'
	import * as m from '$lib/paraglide/messages.js'

	let {
		heading,
		headingTestId = undefined,
		children
	}: {
		heading: string
		headingTestId?: string | undefined
		children: Snippet
	} = $props()

	let dialog = $state<HTMLDialogElement>(undefined!)
	let visible = $state(false)
	const duration = AppSettings.transitionDuration.duration

	export function open() {
		dialog.showModal()
		requestAnimationFrame(() => (visible = true))
	}

	function close() {
		visible = false
		const scrollY = window.scrollY
		const preventScroll = () =>
			window.scrollTo({ top: scrollY, behavior: 'instant' })
		window.addEventListener('scroll', preventScroll)
		setTimeout(() => {
			dialog.close()
			requestAnimationFrame(() => {
				window.removeEventListener('scroll', preventScroll)
			})
		}, duration)
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === dialog) close()
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialog}
	class="dialog panel-surface w-full max-w-md rounded-md p-0 opacity-0 ease-out"
	class:dialog-visible={visible}
	style="--duration: {duration}ms; transition: opacity var(--duration) ease-out, transform var(--duration) ease-out;"
	onclick={onBackdropClick}
	oncancel={(e) => {
		e.preventDefault()
		close()
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape') {
			e.preventDefault()
			close()
		}
	}}
>
	<div class="px-6 py-5 md:px-8 md:py-7">
		<div class="mb-5 flex items-center justify-between md:mb-6">
			<h2
				class="font-handwriting text-3xl text-stone-900 md:text-4xl dark:text-stone-300"
				data-testid={headingTestId}
			>
				{heading}
			</h2>
			<button
				class="text-2xl text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
				onclick={close}
				aria-label={m.button_close()}
				data-testid="btn-dialog-close"
			>
				✕
			</button>
		</div>
		{@render children()}
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
