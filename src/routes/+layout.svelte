<script lang="ts">
	import '../app.css'
	import { onMount } from 'svelte'
	import type { Snippet } from 'svelte'
	import * as m from '$lib/paraglide/messages.js'
	import { getLocale } from '$lib/paraglide/runtime.js'

	let { children }: { children: Snippet } = $props()

	function updateHead() {
		document.documentElement.lang = getLocale()
		document.title = m.app_title_full()
		const desc = document.querySelector('meta[name="description"]')
		if (desc) desc.setAttribute('content', m.app_description())
	}

	onMount(() => {
		updateHead()
	})

	function handleError(error: unknown) {
		console.error('Uncaught render error:', error)
	}

	function safeMsg(fn: () => string, fallback: string): string {
		try {
			return fn()
		} catch {
			return fallback
		}
	}
</script>

<svelte:boundary onerror={handleError}>
	{@render children()}
	{#snippet failed()}
		<div class="flex min-h-screen items-center justify-center p-6">
			<div class="panel-surface max-w-sm rounded-lg p-8 text-center">
				<h1 class="mb-2 text-2xl font-bold text-stone-900 dark:text-stone-100">
					{safeMsg(m.error_boundary_title, 'Something went wrong')}
				</h1>
				<p class="mb-6 text-stone-700 dark:text-stone-300">
					{safeMsg(
						m.error_boundary_message,
						'An unexpected error occurred. Try reloading the page.'
					)}
				</p>
				<button
					class="btn-blue rounded-md px-6 py-2 font-semibold"
					onclick={() => location.reload()}
				>
					{safeMsg(m.error_boundary_reload, 'Reload')}
				</button>
			</div>
		</div>
	{/snippet}
</svelte:boundary>
