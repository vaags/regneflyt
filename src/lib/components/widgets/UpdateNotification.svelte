<script lang="ts">
	import { onMount } from 'svelte'
	import * as m from '$lib/paraglide/messages.js'

	let show = $state(false)
	let waitingWorker: ServiceWorker | null = $state(null)

	function onNewWorkerWaiting(sw: ServiceWorker) {
		waitingWorker = sw
		show = true
	}

	function update() {
		if (waitingWorker) {
			waitingWorker.postMessage({ type: 'SKIP_WAITING' })
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

		navigator.serviceWorker.ready.then((registration) => {
			if (registration.waiting) {
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
					}
				})
			})
		})

		navigator.serviceWorker.addEventListener('controllerchange', () => {
			window.location.reload()
		})
	})
</script>

{#if show}
	<div
		role="alert"
		class="fixed bottom-4 left-1/2 z-50 flex min-w-90 -translate-x-1/2 items-center gap-3 rounded-lg bg-sky-700 px-4 py-3 text-sm text-white shadow-lg dark:bg-sky-600"
	>
		<span>{m.update_available()}</span>
		<button
			class="rounded bg-white px-3 py-1 font-semibold text-sky-700 transition-colors hover:bg-sky-50 dark:bg-stone-100 dark:text-sky-600"
			onclick={update}
		>
			{m.button_update()}
		</button>
		<button
			class="ml-auto text-white/70 transition-colors hover:text-white"
			onclick={dismiss}
			aria-label={m.button_close()}
		>
			✕
		</button>
	</div>
{/if}
