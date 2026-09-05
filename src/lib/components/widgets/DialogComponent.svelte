<script lang="ts">
	import type { Snippet } from 'svelte'
	import { on } from 'svelte/events'
	import { AppSettings } from '#lib/constants/AppSettings.ts'
	import {
		button_close,
		button_no,
		button_yes
	} from '#lib/paraglide/messages.js'
	import { getLocale, type Locale } from '#lib/paraglide/runtime.js'
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
		dismissTestId = undefined,
		initialFocus = 'close'
	}: {
		locale?: Locale | undefined
		heading: string
		headingTestId?: string | undefined
		children?: Snippet | undefined
		confirmColor?: 'red' | 'blue' | 'green' | 'gray' | undefined
		onConfirm?: (() => void) | undefined
		confirmTestId?: string | undefined
		dismissTestId?: string | undefined
		/** Destructive dialogs focus the dismiss action so Enter cannot confirm. */
		initialFocus?: 'close' | 'dismiss'
	} = $props()

	const headingId = $props.id()
	let dialog = $state<HTMLDialogElement | undefined>(undefined)
	let visible = $state(false)
	let triggerElement: HTMLElement | null = null
	const duration = AppSettings.transitionDuration.duration
	// Deliberately omits anchors: a dialog's focus trap only cycles controls it
	// owns. Kept in sync with FOCUSABLE_SELECTOR in
	// tests/e2e/accessibility-extended.spec.ts, which adds a[href].
	const focusableSelector =
		'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

	const closeButtonTestId = 'btn-dialog-close'

	function getFocusableElements() {
		if (!dialog) return []
		return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
	}

	// Resolved here rather than by a prop on the button primitives, which have no
	// business knowing they might be inside a dialog.
	function getInitialFocusElement() {
		const focusable = getFocusableElements()
		const wantedTestId =
			initialFocus === 'dismiss' ? dismissTestId : closeButtonTestId
		// Without this an undefined target would match the first element that has
		// no testid at all, rather than falling back to the first focusable one.
		if (wantedTestId === undefined) return focusable[0]

		return (
			focusable.find((element) => element.dataset['testid'] === wantedTestId) ??
			focusable[0]
		)
	}

	export function open() {
		const activeElement = document.activeElement
		triggerElement = activeElement instanceof HTMLElement ? activeElement : null
		visible = false
		dialog?.showModal()
		requestAnimationFrame(() => {
			if (!dialog?.open) return
			const firstFocusable = getInitialFocusElement()
			if (firstFocusable) {
				firstFocusable.focus()
			} else {
				dialog?.focus()
			}
			visible = true
		})
	}

	export function close() {
		visible = false
		const scrollY = window.scrollY
		const preventScroll = () =>
			window.scrollTo({ top: scrollY, behavior: 'instant' })
		const removePreventScrollListener = on(window, 'scroll', preventScroll)
		setTimeout(() => {
			dialog?.close()
			requestAnimationFrame(() => {
				removePreventScrollListener()
			})
		}, duration)
	}

	function restoreTriggerFocus() {
		triggerElement?.focus()
		triggerElement = null
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
	aria-modal="true"
	aria-labelledby={headingId}
	class="dialog panel-surface w-full max-w-md rounded-md p-0 opacity-0 ease-out"
	class:dialog-visible={visible}
	class:dialog-duration-default={duration !== 0}
	class:dialog-duration-none={duration === 0}
	onclick={onBackdropClick}
	onclose={restoreTriggerFocus}
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
			const first = focusable[0]
			const last = focusable[focusable.length - 1]
			if (!first || !last)
				throw new Error('Expected focusable elements after length check')
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
				id={headingId}
				class="font-handwriting text-3xl text-stone-900 md:text-4xl dark:text-stone-100"
				data-testid={headingTestId}
			>
				{heading}
			</h2>
			<CloseButtonComponent
				onclick={close}
				ariaLabel={button_close({}, { locale })}
				testId={closeButtonTestId}
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
