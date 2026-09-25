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
	class="dialog"
	data-visible={visible || undefined}
	data-motion={duration === 0 ? 'none' : 'default'}
	data-panel-surface
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
	<div class="content">
		<div class="header">
			<h2 id={headingId} class="heading" data-testid={headingTestId}>
				{heading}
			</h2>
			<div class="close">
				<CloseButtonComponent
					onclick={close}
					ariaLabel={button_close({}, { locale })}
					testId={closeButtonTestId}
				/>
			</div>
		</div>
		{@render children?.()}
		{#if confirmColor !== undefined && onConfirm !== undefined}
			<div class="actions">
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
		inline-size: 100%;
		max-inline-size: 28rem;
		margin: auto;
		padding: 0;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-control);
		background: var(--color-surface);
		color: var(--color-text-primary);
		box-shadow: var(--shadow-panel);
		opacity: 0;
		transform: translateY(8px);
		will-change: opacity, transform;

		&[data-motion='default'] {
			transition:
				opacity 200ms ease-out,
				transform 200ms ease-out;

			&::backdrop {
				transition: opacity 200ms ease-out;
			}
		}

		&[data-visible='true'] {
			opacity: 1;
			transform: scale(1) translateY(0);

			&::backdrop {
				opacity: 1;
			}
		}

		&::backdrop {
			background: rgb(0 0 0 / 0.5);
			opacity: 0;
		}

		& .content {
			padding: 1.25rem 1.5rem;
		}

		& .header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-block-end: 1.25rem;
		}

		& .heading {
			color: var(--color-text-primary);
			font-family: var(--font-handwriting);
			font-size: 1.875rem;
			font-weight: 400;
		}

		& .close {
			margin-block-start: -1.5rem;
			margin-inline-end: -1.25rem;
		}

		& .actions {
			display: flex;
			justify-content: flex-end;
			gap: 0.5rem;
			margin: 1.25rem -1.5rem -1.25rem;
			padding: 1rem 1.5rem;
			border-block-start: 1px solid var(--color-border-subtle);
		}
	}

	@media (min-width: 48rem) {
		.dialog {
			& .content {
				padding: 1.75rem 2rem;
			}

			& .header {
				margin-block-end: 1.5rem;
			}

			& .heading {
				font-size: 2.25rem;
			}

			& .close {
				margin-block-start: -2.25rem;
				margin-inline-end: -1.5rem;
			}

			& .actions {
				margin: 1.5rem -2rem -1.75rem;
				padding: 1.25rem 2rem;
			}
		}
	}
</style>
