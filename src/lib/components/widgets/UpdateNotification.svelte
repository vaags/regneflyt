<script lang="ts">
	import { onMount } from 'svelte'
	import { on } from 'svelte/events'
	import {
		button_close,
		button_update,
		update_available
	} from '#lib/paraglide/messages.js'
	import { getLocale, type Locale } from '#lib/paraglide/runtime.js'

	let { locale = getLocale() }: { locale?: Locale | undefined } = $props()

	let show = $state(false)
	let waitingWorker: ServiceWorker | null = $state(null)
	let detachWaitingWorkerStateHandler: (() => void) | null = null

	function detachWaitingWorkerHandler() {
		if (detachWaitingWorkerStateHandler) {
			detachWaitingWorkerStateHandler()
		}

		detachWaitingWorkerStateHandler = null
	}

	function isWaitingWorker(worker: ServiceWorker) {
		return worker.state !== 'redundant'
	}

	function onNewWorkerWaiting(sw: ServiceWorker) {
		if (!isWaitingWorker(sw)) return

		detachWaitingWorkerHandler()
		waitingWorker = sw
		detachWaitingWorkerStateHandler = on(sw, 'statechange', () => {
			if (sw.state === 'redundant') {
				waitingWorker = null
			}
		})
		show = true
	}

	function update() {
		if (waitingWorker) {
			waitingWorker.postMessage({ type: 'SKIP_WAITING' })
		} else {
			// A waiting worker goes redundant when another tab activates the update,
			// so reloading is what actually delivers it.
			window.location.reload()
		}
	}

	function dismiss() {
		show = false
	}

	export function showNotification() {
		show = true
	}

	onMount(() => {
		if (!('serviceWorker' in navigator)) return
		const cleanupFns: Array<() => void> = []
		let destroyed = false

		void navigator.serviceWorker.ready.then((registration) => {
			if (destroyed) return
			if (registration.waiting && isWaitingWorker(registration.waiting)) {
				onNewWorkerWaiting(registration.waiting)
			}

			cleanupFns.push(
				on(registration, 'updatefound', () => {
					const newWorker = registration.installing
					if (!newWorker) return

					cleanupFns.push(
						on(newWorker, 'statechange', () => {
							if (
								newWorker.state === 'installed' &&
								navigator.serviceWorker.controller
							) {
								onNewWorkerWaiting(newWorker)
							}
						})
					)
				})
			)
		})

		cleanupFns.push(
			on(navigator.serviceWorker, 'controllerchange', () => {
				detachWaitingWorkerHandler()
				window.location.reload()
			})
		)

		return () => {
			destroyed = true
			detachWaitingWorkerHandler()
			for (const cleanup of cleanupFns.splice(0)) {
				cleanup()
			}
		}
	})
</script>

<!-- Mounted unconditionally and text-only: a live region inserted together with
     its content is not announced, and wrapping the notification would put both
     button labels in the announcement. -->
<div role="status" class="visually-hidden">
	{show ? update_available({}, { locale }) : ''}
</div>
{#if show}
	<!-- The bottom offsets clear the sticky global nav. -->
	<div
		data-testid="update-notification-alert"
		data-sticky-nav-clearance="true"
		class="update-notification"
	>
		<span data-testid="update-notification-message"
			>{update_available({}, { locale })}</span
		>
		<button
			type="button"
			data-testid="btn-update-notification-update"
			class="update-notification__update focus-indicator"
			data-focus-inverse="true"
			onclick={update}
		>
			{button_update({}, { locale })}
		</button>
		<button
			type="button"
			data-testid="btn-update-notification-dismiss"
			class="update-notification__dismiss focus-indicator expanded-hit-area"
			data-focus-inverse="true"
			onclick={dismiss}
			aria-label={button_close({}, { locale })}
		>
			✕
		</button>
	</div>
{/if}

<style>
	.update-notification {
		position: fixed;
		bottom: calc(env(safe-area-inset-bottom) + 148px);
		left: 50%;
		z-index: 50;
		display: flex;
		align-items: center;
		min-inline-size: 20rem;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-radius: var(--radius-panel);
		background: var(--color-primary-700);
		color: white;
		box-shadow: var(--shadow-elevated);
		transform: translateX(-50%);
	}

	.update-notification__update {
		min-block-size: var(--target-minimum);
		padding: 0.25rem 0.75rem;
		border-radius: 0.25rem;
		background: white;
		color: var(--color-primary-700);
		font-weight: 600;
		transition: background-color 150ms;
	}

	.update-notification__update:hover {
		background: var(--color-primary-50);
	}

	.update-notification__dismiss {
		margin-inline-start: auto;
		border-radius: 0.25rem;
		background: transparent;
		color: rgb(255 255 255 / 0.7);
		transition: color 150ms;
	}

	.update-notification__dismiss:hover {
		color: white;
	}

	@media (min-width: 48rem) {
		.update-notification {
			bottom: calc(env(safe-area-inset-bottom) + 160px);
		}
	}
</style>
