<script lang="ts">
	import type { Snippet } from 'svelte'
	import { AppSettings } from '$lib/constants/AppSettings'
	import {
		button_close,
		button_no,
		button_yes
	} from '$lib/paraglide/messages.js'
	import { getLocale, type Locale } from '$lib/paraglide/runtime.js'
	import ButtonComponent from './ButtonComponent.svelte'
	import CloseButtonComponent from './CloseButtonComponent.svelte'

	let {
		locale = getLocale(),
		heading,
		headingTestId = undefined,
		children = undefined,
		confirmColor = undefined,
		onConfirm = undefined,
		confirmTestId = undefined,
		dismissTestId = undefined
	}: {
		locale?: Locale | undefined
		heading: string
		headingTestId?: string | undefined
		children?: Snippet | undefined
		confirmColor?: 'red' | 'blue' | 'green' | 'gray' | undefined
		onConfirm?: (() => void) | undefined
		confirmTestId?: string | undefined
		dismissTestId?: string | undefined
	} = $props()

	let dialog = $state<HTMLDialogElement>(undefined!)
	let visible = $state(false)
	let triggerElement: HTMLElement | null = null
	const duration = AppSettings.transitionDuration.duration
	const focusableSelector =
		'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

	function getFocusableElements() {
		if (!dialog) return []
		return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
	}

	export function open() {
		triggerElement = document.activeElement as HTMLElement | null
		visible = false
		dialog.showModal()
		requestAnimationFrame(() => {
			if (!dialog?.open) return
			const firstFocusable =
				dialog.querySelector<HTMLElement>('[data-dialog-initial-focus]') ??
				getFocusableElements()[0]
			if (firstFocusable) {
				firstFocusable.focus()
			} else {
				dialog.focus()
			}
			visible = true
		})
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

<dialog
	bind:this={dialog}
	tabindex="-1"
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
		} else if (e.key === 'Tab') {
			const focusable = getFocusableElements()
			if (focusable.length === 0) {
				e.preventDefault()
				return
			}
			const first = focusable[0]!
			const last = focusable[focusable.length - 1]!
			if (e.shiftKey) {
				if (
					document.activeElement === first ||
					document.activeElement === dialog
				) {
					e.preventDefault()
					last.focus()
				}
			} else if (
				document.activeElement === last ||
				document.activeElement === dialog
			) {
				e.preventDefault()
				first.focus()
			}
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
				ariaLabel={button_close({}, { locale })}
				initialFocus={true}
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
					testId={confirmTestId}>{button_yes({}, { locale })}</ButtonComponent
				>
				<ButtonComponent size="small" onclick={close} testId={dismissTestId}
					>{button_no({}, { locale })}</ButtonComponent
				>
			</div>
		{/if}
	</div>
</dialog>

<style>
	.dialog {
		margin: auto;
		transform: translateY(8px);
		will-change: opacity, transform;
	}

	.dialog-visible {
		opacity: 1;
		transform: scale(1) translateY(0);
	}

	.dialog::backdrop {
		background: rgba(0, 0, 0, 0.5);
		opacity: 0;
		transition: opacity var(--duration) ease-out;
	}

	.dialog-visible::backdrop {
		opacity: 1;
	}
</style>
