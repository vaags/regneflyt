<script lang="ts">
	import '../app.css'
	import { onMount } from 'svelte'
	import { onNavigate } from '$app/navigation'
	import type { Snippet } from 'svelte'
	import * as m from '$lib/paraglide/messages.js'
	import { type Locale, getLocale } from '$lib/paraglide/runtime.js'
	import { clearDevStorage, theme, applyTheme } from '$lib/stores'
	import { overallSkill, lastResults } from '$lib/stores'
	import SettingsPanel from '$lib/components/panels/SettingsPanel.svelte'
	import SkillDialogComponent from '$lib/components/dialogs/SkillDialogComponent.svelte'
	import UpdateNotification from '$lib/components/widgets/UpdateNotification.svelte'
	import {
		getLocaleNames,
		switchLocale as doSwitchLocale
	} from '$lib/helpers/localeHelper'

	let { children }: { children: Snippet } = $props()

	let locale = $state<string>('')
	let localeNames = $derived(getLocaleNames())
	let skillDialog = $state<SkillDialogComponent>(undefined!)
	let updateNotification = $state<UpdateNotification>(undefined!)
	let showSettings = $state(false)

	function updateHead() {
		document.documentElement.lang = getLocale()
		document.title = m.app_title_full()
		const desc = document.querySelector('meta[name="description"]')
		if (desc) desc.setAttribute('content', m.app_description())
	}

	onMount(() => {
		locale = getLocale()
		applyTheme($theme)
		window
			.matchMedia('(prefers-color-scheme: dark)')
			.addEventListener('change', () => {
				if ($theme === 'system') applyTheme('system')
			})
		updateHead()
	})

	onNavigate((navigation) => {
		showSettings = false
		if (!document.startViewTransition) return
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve()
				await navigation.complete
			})
		})
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
	{#key locale}
		<a
			href="#main-content"
			class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-sky-700 focus:shadow dark:focus:bg-stone-800 dark:focus:text-sky-300"
		>
			{m.sr_skip_to_content()}
		</a>
		<div
			class="container mx-auto flex min-h-screen max-w-lg min-w-min flex-col px-2 py-2 md:max-w-xl md:px-4 md:py-3"
		>
			<header
				class="font-handwriting pointer-events-none z-10 flex items-end justify-between"
				style="view-transition-name: header"
			>
				<div>
					{#if $overallSkill || $lastResults}
						<button
							class="pointer-events-auto min-h-11 min-w-11 text-3xl text-amber-900 transition-colors hover:text-amber-800 md:text-4xl dark:text-amber-100 dark:hover:text-amber-200"
							data-testid="btn-skill"
							title={m.heading_skill_level()}
							onclick={() => skillDialog.open()}
						>
							{$overallSkill}%
						</button>
					{/if}
				</div>
				<div class="text-right">
					<div class="flex items-center justify-end gap-3">
						<h1
							class="-mr-3 -mb-0.5 text-4xl text-orange-700 drop-shadow-sm md:text-5xl dark:text-orange-500 dark:drop-shadow-md"
						>
							{m.app_title()}
						</h1>
						<button
							class="pointer-events-auto flex min-h-11 min-w-11 items-center justify-center transition-colors {showSettings
								? 'text-stone-900 dark:text-stone-100'
								: 'text-stone-600 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'}"
							data-testid="btn-settings"
							title={m.heading_settings()}
							aria-label={m.sr_open_settings()}
							aria-expanded={showSettings}
							onclick={() => (showSettings = !showSettings)}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<line x1="4" y1="6" x2="20" y2="6" />
								<line x1="4" y1="12" x2="20" y2="12" />
								<line x1="4" y1="18" x2="20" y2="18" />
								<circle cx="8" cy="6" r="2" fill="currentColor" />
								<circle cx="16" cy="12" r="2" fill="currentColor" />
								<circle cx="10" cy="18" r="2" fill="currentColor" />
							</svg>
						</button>
					</div>
				</div>
			</header>
			{#if showSettings}
				<SettingsPanel
					{locale}
					{localeNames}
					onSwitchLocale={(l) => {
						const newLocale = doSwitchLocale(l as Locale)
						if (newLocale) locale = newLocale
					}}
					onClearDevStorage={() => {
						clearDevStorage()
						window.location.reload()
					}}
					onSimulateUpdate={() => updateNotification.showNotification()}
				/>
			{/if}
			<main
				id="main-content"
				class="mb-3 flex-1"
				style="view-transition-name: main-content"
			>
				{@render children()}
			</main>
			<SkillDialogComponent bind:this={skillDialog} />
			<UpdateNotification bind:this={updateNotification} />
		</div>
	{/key}
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
