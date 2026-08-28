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
<div role="status" class="sr-only">
	{show ? update_available({}, { locale }) : ''}
</div>
{#if show}
	<!-- The bottom offsets clear the sticky global nav. -->
	<div
		data-testid="update-notification-alert"
		class="fixed bottom-[calc(env(safe-area-inset-bottom)+148px)] left-1/2 z-50 flex min-w-80 -translate-x-1/2 items-center gap-3 rounded-lg bg-sky-700 px-4 py-3 text-white shadow-lg md:bottom-[calc(env(safe-area-inset-bottom)+160px)] dark:bg-sky-600"
	>
		<span data-testid="update-notification-message"
			>{update_available({}, { locale })}</span
		>
		<button
			type="button"
			data-testid="btn-update-notification-update"
			class="focus-ring-inverse min-h-11 rounded bg-white px-3 py-1 font-semibold text-sky-700 transition-colors hover:bg-sky-50 dark:bg-stone-100 dark:text-sky-600"
			onclick={update}
		>
			{button_update({}, { locale })}
		</button>
		<button
			type="button"
			data-testid="btn-update-notification-dismiss"
			class="focus-ring-inverse relative ml-auto rounded text-white/70 transition-colors after:absolute after:top-1/2 after:left-1/2 after:min-h-11 after:min-w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-[''] hover:text-white"
			onclick={dismiss}
			aria-label={button_close({}, { locale })}
		>
			✕
		</button>
	</div>
{/if}
