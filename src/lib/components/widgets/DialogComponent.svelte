<script lang="ts">
	import { flushSync } from 'svelte'
	import type { Snippet } from 'svelte'
	import { AppSettings } from '$lib/constants/AppSettings'
	import * as m from '$lib/paraglide/messages.js'
	import ButtonComponent from './ButtonComponent.svelte'
	import CloseButtonComponent from './CloseButtonComponent.svelte'

	let {
		heading,
		headingTestId = undefined,
		children = undefined,
		confirmColor = undefined,
		onConfirm = undefined,
		confirmTestId = undefined,
		dismissTestId = undefined
	}: {
		heading: string
		headingTestId?: string | undefined
		children?: Snippet | undefined
		confirmColor?: 'red' | 'blue' | 'yellow' | 'green' | 'gray' | undefined
		onConfirm?: (() => void) | undefined
		confirmTestId?: string | undefined
		dismissTestId?: string | undefined
	} = $props()

	let dialog = $state<HTMLDialogElement>(undefined!)
	let visible = $state(false)
	let triggerElement: HTMLElement | null = null
	const duration = AppSettings.transitionDuration.duration

	export function open() {
		triggerElement = document.activeElement as HTMLElement | null
		dialog.showModal()
		flushSync(() => (visible = true))
	}

	export function close() {
		visible = false
		const scrollY = window.scrollY
		const preventScroll = () =>
			window.scrollTo({ top: scrollY, behavior: 'instant' })
		window.addEventListener('scroll', preventScroll)
		setTimeout(() => {
			dialog?.close()
			triggerElement?.focus()
			triggerElement = null
			requestAnimationFrame(() => {
				window.removeEventListener('scroll', preventScroll)
			})
		}, duration)
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === dialog) close()
	}

	function handleConfirm() {
		onConfirm?.()
		close()
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
			<CloseButtonComponent
				onclick={close}
				ariaLabel={m.button_close()}
				testId="btn-dialog-close"
				className="-mt-6 -mr-5 md:-mt-9 md:-mr-6"
			/>
		</div>
		{@render children?.()}
		{#if confirmColor !== undefined && onConfirm !== undefined}
			<div
				class="flex justify-end gap-2 border-t border-stone-200 px-6 py-4 md:px-8 md:py-5 dark:border-stone-700"
			>
				<ButtonComponent
					size="small"
					color={confirmColor}
					onclick={handleConfirm}
					testId={confirmTestId}>{m.button_yes()}</ButtonComponent
				>
				<ButtonComponent size="small" onclick={close} testId={dismissTestId}
					>{m.button_no()}</ButtonComponent
				>
			</div>
		{/if}
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
