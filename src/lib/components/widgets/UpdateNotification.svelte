<script lang="ts">
	import { onMount } from 'svelte'
	import { on } from 'svelte/events'
	import {
		button_close,
		button_update,
		update_available
	} from '$lib/paraglide/messages.js'
	import { getLocale, type Locale } from '$lib/paraglide/runtime.js'

	let { locale = getLocale() }: { locale?: Locale | undefined } = $props()

	let show = $state(false)
	let waitingWorker: ServiceWorker | null = $state(null)
	let detachWaitingWorkerStateHandler: (() => void) | null = null

	const CROSS_TAB_UPDATE_KEY = 'regneflyt.sw.skip-waiting'
	const notificationContainerBottomClass =
		'bottom-[calc(env(safe-area-inset-bottom)+148px)] md:bottom-[calc(env(safe-area-inset-bottom)+160px)]'

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
			try {
				localStorage.setItem(CROSS_TAB_UPDATE_KEY, String(Date.now()))
			} catch {}
		} else {
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

		const onStorage = (event: StorageEvent) => {
			if (event.key !== CROSS_TAB_UPDATE_KEY || !waitingWorker) return
			waitingWorker.postMessage({ type: 'SKIP_WAITING' })
		}

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
								return
							}

							if (newWorker.state === 'redundant') {
								return
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
			}),
			on(window, 'storage', onStorage)
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

{#if show}
	<div
		role="alert"
		data-testid="update-notification-alert"
		class="fixed left-1/2 z-50 flex min-w-80 -translate-x-1/2 items-center gap-3 rounded-lg bg-sky-700 px-4 py-3 text-white shadow-lg {notificationContainerBottomClass} dark:bg-sky-600"
	>
		<span>{update_available({}, { locale })}</span>
		<button
			type="button"
			data-testid="btn-update-notification-update"
			class="rounded bg-white px-3 py-1 font-semibold text-sky-700 transition-colors hover:bg-sky-50 dark:bg-stone-100 dark:text-sky-600"
			onclick={update}
		>
			{button_update({}, { locale })}
		</button>
		<button
			type="button"
			data-testid="btn-update-notification-dismiss"
			class="ml-auto text-white/70 transition-colors hover:text-white"
			onclick={dismiss}
			aria-label={button_close({}, { locale })}
		>
			✕
		</button>
	</div>
{/if}
