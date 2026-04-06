<script lang="ts">
	import { onMount } from 'svelte'
	import {
		button_close,
		button_update,
		update_available
	} from '$lib/paraglide/messages.js'
	import { getLocale, type Locale } from '$lib/paraglide/runtime.js'

	let { locale = getLocale() }: { locale?: Locale | undefined } = $props()

	let show = $state(false)
	let waitingWorker: ServiceWorker | null = $state(null)
	let waitingWorkerStateHandler: (() => void) | null = null

	const CROSS_TAB_UPDATE_KEY = 'regneflyt.sw.skip-waiting'
	const notificationContainerBottomClass =
		'bottom-[calc(env(safe-area-inset-bottom)+148px)] md:bottom-[calc(env(safe-area-inset-bottom)+160px)]'

	function detachWaitingWorkerHandler() {
		if (waitingWorker && waitingWorkerStateHandler) {
			waitingWorker.removeEventListener(
				'statechange',
				waitingWorkerStateHandler
			)
		}

		waitingWorkerStateHandler = null
	}

	function isWaitingWorker(worker: ServiceWorker) {
		return worker.state !== 'redundant'
	}

	function onNewWorkerWaiting(sw: ServiceWorker) {
		if (!isWaitingWorker(sw)) return

		detachWaitingWorkerHandler()
		waitingWorker = sw
		waitingWorkerStateHandler = () => {
			if (sw.state === 'redundant') {
				waitingWorker = null
			}
		}
		sw.addEventListener('statechange', waitingWorkerStateHandler)
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

		const onStorage = (event: StorageEvent) => {
			if (event.key !== CROSS_TAB_UPDATE_KEY || !waitingWorker) return
			waitingWorker.postMessage({ type: 'SKIP_WAITING' })
		}

		navigator.serviceWorker.ready.then((registration) => {
			if (registration.waiting && isWaitingWorker(registration.waiting)) {
				onNewWorkerWaiting(registration.waiting)
			}

			registration.addEventListener('updatefound', () => {
				const newWorker = registration.installing
				if (!newWorker) return

				newWorker.addEventListener('statechange', () => {
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
			})
		})

		navigator.serviceWorker.addEventListener('controllerchange', () => {
			detachWaitingWorkerHandler()
			window.location.reload()
		})

		window.addEventListener('storage', onStorage)

		return () => {
			window.removeEventListener('storage', onStorage)
			detachWaitingWorkerHandler()
		}
	})
</script>

{#if show}
	<div
		role="alert"
		class="fixed left-1/2 z-50 flex min-w-80 -translate-x-1/2 items-center gap-3 rounded-lg bg-sky-700 px-4 py-3 text-white shadow-lg {notificationContainerBottomClass} dark:bg-sky-600"
	>
		<span>{update_available({}, { locale })}</span>
		<button
			class="rounded bg-white px-3 py-1 font-semibold text-sky-700 transition-colors hover:bg-sky-50 dark:bg-stone-100 dark:text-sky-600"
			onclick={update}
		>
			{button_update({}, { locale })}
		</button>
		<button
			class="ml-auto text-white/70 transition-colors hover:text-white"
			onclick={dismiss}
			aria-label={button_close({}, { locale })}
		>
			✕
		</button>
	</div>
{/if}
