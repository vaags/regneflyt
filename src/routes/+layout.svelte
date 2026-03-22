<script lang="ts">
	import '../app.css'
	import { onMount, tick, type Component } from 'svelte'
	import { onNavigate } from '$app/navigation'
	import type { Snippet } from 'svelte'
	import {
		app_description,
		app_title,
		app_title_full,
		error_boundary_message,
		error_boundary_reload,
		error_boundary_title,
		heading_settings,
		heading_skill_level,
		sr_open_settings,
		sr_skip_to_content
	} from '$lib/paraglide/messages.js'
	import { type Locale, getLocale } from '$lib/paraglide/runtime.js'
	import { clearAllProgress, theme, applyTheme } from '$lib/stores'
	import { overallSkill, lastResults } from '$lib/stores'
	import {
		getLocaleNames,
		switchLocale as doSwitchLocale
	} from '$lib/helpers/localeHelper'

	let { children }: { children: Snippet } = $props()

	let locale = $state<string>('')
	let localeNames = $derived.by(() => {
		locale // subscribe to locale changes
		return getLocaleNames()
	})
	let SettingsPanelComponent = $state<Component<{
		locale: string
		localeNames: Record<string, string>
		onSwitchLocale: (l: string) => void
		noSettingsSlide?: boolean
		onDeleteProgress?: () => void
		onSimulateUpdate?: () => void
	}> | null>(null)
	let SkillDialogLoadedComponent = $state<Component<
		Record<string, never>,
		{ open: () => void }
	> | null>(null)
	let DeleteProgressDialogLoadedComponent = $state<Component<
		{ onConfirm?: () => void },
		{ open: () => void }
	> | null>(null)
	let UpdateNotificationLoadedComponent = $state<Component<
		Record<string, never>,
		{ showNotification: () => void }
	> | null>(null)
	let skillDialog = $state<{ open: () => void } | undefined>(undefined)
	let deleteProgressDialog = $state<{ open: () => void } | undefined>(undefined)
	let updateNotification = $state<{ showNotification: () => void } | undefined>(
		undefined
	)
	let showSettings = $state(false)

	async function ensureSettingsPanel() {
		if (!SettingsPanelComponent) {
			SettingsPanelComponent = (
				await import('$lib/components/panels/SettingsPanel.svelte')
			).default
		}
	}

	async function ensureSkillDialog() {
		if (!SkillDialogLoadedComponent) {
			SkillDialogLoadedComponent = (
				await import('$lib/components/dialogs/SkillDialogComponent.svelte')
			).default
			await tick()
		}
	}

	async function ensureDeleteProgressDialog() {
		if (!DeleteProgressDialogLoadedComponent) {
			DeleteProgressDialogLoadedComponent = (
				await import('$lib/components/dialogs/DeleteProgressDialogComponent.svelte')
			).default
			await tick()
		}
	}

	async function ensureUpdateNotification() {
		if (!UpdateNotificationLoadedComponent) {
			UpdateNotificationLoadedComponent = (
				await import('$lib/components/widgets/UpdateNotification.svelte')
			).default
			await tick()
		}
	}

	async function openSkillDialog() {
		await ensureSkillDialog()
		skillDialog?.open()
	}

	async function openDeleteProgressDialog() {
		await ensureDeleteProgressDialog()
		deleteProgressDialog?.open()
	}

	async function toggleSettings() {
		if (!showSettings) await ensureSettingsPanel()
		showSettings = !showSettings
	}

	async function simulateUpdateNotification() {
		await ensureUpdateNotification()
		updateNotification?.showNotification()
	}

	function updateHead() {
		document.documentElement.lang = getLocale()
		document.title = app_title_full()
		const desc = document.querySelector('meta[name="description"]')
		if (desc) desc.setAttribute('content', app_description())
	}

	onMount(() => {
		locale = getLocale()
		applyTheme($theme)
		void ensureUpdateNotification()
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
			{sr_skip_to_content()}
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
							title={heading_skill_level()}
							onclick={openSkillDialog}
						>
							{$overallSkill}%
						</button>
					{/if}
				</div>
				<div class="text-right">
					<div class="flex items-center justify-end gap-3">
						<h1
							class="-mr-3 text-4xl text-orange-700 drop-shadow-sm md:text-5xl dark:text-orange-500 dark:drop-shadow-md"
						>
							{app_title()}
						</h1>
						<button
							class="pointer-events-auto flex min-h-11 min-w-11 items-center justify-center transition-colors {showSettings
								? 'text-stone-900 dark:text-stone-100'
								: 'text-stone-600 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'}"
							data-testid="btn-settings"
							title={heading_settings()}
							aria-label={sr_open_settings()}
							aria-expanded={showSettings}
							onclick={toggleSettings}
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
			{#if showSettings && SettingsPanelComponent}
				<SettingsPanelComponent
					{locale}
					{localeNames}
					onSwitchLocale={(l) => {
						const newLocale = doSwitchLocale(l as Locale)
						if (newLocale) {
							locale = newLocale
							updateHead()
						}
					}}
					onDeleteProgress={openDeleteProgressDialog}
					onSimulateUpdate={simulateUpdateNotification}
				/>
			{/if}
			<main
				id="main-content"
				class="mb-3 flex-1"
				style="view-transition-name: main-content"
			>
				{@render children()}
			</main>
			{#if SkillDialogLoadedComponent}
				<SkillDialogLoadedComponent bind:this={skillDialog} />
			{/if}
			{#if DeleteProgressDialogLoadedComponent}
				<DeleteProgressDialogLoadedComponent
					bind:this={deleteProgressDialog}
					onConfirm={() => {
						clearAllProgress()
						window.location.reload()
					}}
				/>
			{/if}
			{#if UpdateNotificationLoadedComponent}
				<UpdateNotificationLoadedComponent bind:this={updateNotification} />
			{/if}
		</div>
	{/key}
	{#snippet failed()}
		<div class="flex min-h-screen items-center justify-center p-6">
			<div class="panel-surface max-w-sm rounded-lg p-8 text-center">
				<h1 class="mb-2 text-2xl font-bold text-stone-900 dark:text-stone-100">
					{safeMsg(error_boundary_title, 'Something went wrong')}
				</h1>
				<p class="mb-6 text-stone-700 dark:text-stone-300">
					{safeMsg(
						error_boundary_message,
						'An unexpected error occurred. Try reloading the page.'
					)}
				</p>
				<button
					class="btn-blue rounded-md px-6 py-2 font-semibold"
					onclick={() => location.reload()}
				>
					{safeMsg(error_boundary_reload, 'Reload')}
				</button>
			</div>
		</div>
	{/snippet}
</svelte:boundary>
