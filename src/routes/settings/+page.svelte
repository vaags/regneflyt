<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import {
		alert_progress_deleted,
		app_github_sr,
		button_delete_progress,
		heading_accessibility,
		heading_advanced,
		label_language,
		label_notification_timing,
		label_notification_timing_auto,
		label_notification_timing_persistent,
		label_theme,
		theme_dark,
		theme_light,
		theme_system,
		update_available
	} from '$lib/paraglide/messages.js'
	import { locales } from '$lib/paraglide/runtime.js'
	import { getLocale, type Locale } from '$lib/paraglide/runtime.js'
	import { getLocaleNames } from '$lib/helpers/localeHelper'
	import {
		clearAllProgress,
		theme,
		applyTheme,
		showToast,
		showDevTools,
		notificationTiming,
		toggleDevToolsVisibility,
		type NotificationTimingPreference,
		type ThemePreference
	} from '$lib/stores'
	import {
		createDevTapState,
		handleDevTap
	} from '$lib/helpers/layout/layoutSetupHelper'
	import { version } from '$app/environment'
	import { getSettingsRouteContext } from '$lib/contexts/settingsRouteContext'
	import { getStickyGlobalNavContext } from '$lib/contexts/stickyGlobalNavContext'
	import type { DialogHandle } from '$lib/models/DialogHandle'
	import PanelComponent from '$lib/components/widgets/PanelComponent.svelte'
	import ButtonComponent from '$lib/components/widgets/ButtonComponent.svelte'
	import DeleteProgressDialogComponent from '$lib/components/dialogs/DeleteProgressDialogComponent.svelte'
	import ContinueCodePanel from '$lib/components/panels/ContinueCodePanel.svelte'
	import { buildPathWithQuizQueryParams } from '$lib/helpers/urlParamsHelper'

	const settingsRouteContext = getSettingsRouteContext()
	const stickyGlobalNavContext = getStickyGlobalNavContext()
	let locale = $state<Locale>(getLocale())
	let staticMessages = $derived.by(() => {
		locale
		return {
			alertProgressDeleted: alert_progress_deleted({}, { locale }),
			appGithubSr: app_github_sr({}, { locale }),
			buttonDeleteProgress: button_delete_progress({}, { locale }),
			headingAccessibility: heading_accessibility({}, { locale }),
			headingAdvanced: heading_advanced({}, { locale }),
			labelLanguage: label_language({}, { locale }),
			labelNotificationTiming: label_notification_timing({}, { locale }),
			labelNotificationTimingAuto: label_notification_timing_auto(
				{},
				{ locale }
			),
			labelNotificationTimingPersistent: label_notification_timing_persistent(
				{},
				{ locale }
			),
			labelTheme: label_theme({}, { locale }),
			updateAvailable: update_available({}, { locale })
		}
	})
	let themeOptions = $derived.by(() => {
		locale
		return [
			{
				value: 'system',
				label: theme_system({}, { locale })
			},
			{ value: 'light', label: theme_light({}, { locale }) },
			{ value: 'dark', label: theme_dark({}, { locale }) }
		] satisfies { value: ThemePreference; label: string }[]
	})

	let localeNames = $derived.by(() => {
		locale // keep this derived value reactive after locale switches
		return getLocaleNames()
	})
	let deleteProgressDialog = $state<DialogHandle | undefined>(undefined)
	let settingsRouteHydrated = $state(false)
	const isDevEnvironment = import.meta.env.DEV
	const devTapState = createDevTapState()

	function handleSwitchLocale(nextLocale: Locale) {
		const newLocale = settingsRouteContext.switchLocale(nextLocale)
		if (newLocale) locale = newLocale
	}

	function handleSimulateUpdate() {
		settingsRouteContext.simulateUpdateNotification()
	}

	function switchTheme(newTheme: ThemePreference) {
		theme.current = newTheme
		applyTheme(newTheme)
	}

	function setNotificationTiming(value: NotificationTimingPreference) {
		notificationTiming.current = value
	}

	function openDeleteProgressDialog() {
		deleteProgressDialog?.open()
	}

	function navigateToQuiz() {
		const destination = buildPathWithQuizQueryParams(
			'/quiz',
			new URLSearchParams(window.location.search)
		)
		void goto(destination)
	}

	onMount(() => {
		settingsRouteHydrated = true
	})

	$effect(() => {
		const unregister = stickyGlobalNavContext.registerStartActions({
			onStart: navigateToQuiz
		})

		return unregister
	})
</script>

<div
	data-testid="settings-panel"
	data-settings-hydrated={settingsRouteHydrated ? 'true' : 'false'}
	class="font-sans text-sm"
>
	<PanelComponent heading={staticMessages.labelLanguage} collapsible={false}>
		<fieldset>
			<legend class="sr-only">{staticMessages.labelLanguage}</legend>
			{#each locales as l (l)}
				<label
					for="settings-language-{l}"
					class="flex min-h-11 items-center py-1 text-lg"
				>
					<input
						id="settings-language-{l}"
						type="radio"
						class="mr-2 h-5 w-5"
						name="settings-language"
						data-testid="settings-language-{l}"
						checked={locale === l}
						onchange={() => handleSwitchLocale(l)}
						value={l}
					/>
					<span>{localeNames[l] ?? l.toUpperCase()}</span>
				</label>
			{/each}
		</fieldset>
	</PanelComponent>

	<PanelComponent heading={staticMessages.labelTheme} collapsible={false}>
		<fieldset>
			<legend class="sr-only">{staticMessages.labelTheme}</legend>
			{#each themeOptions as option (option.value)}
				<label
					for="settings-theme-{option.value}"
					class="flex min-h-11 items-center py-1 text-lg"
				>
					<input
						id="settings-theme-{option.value}"
						type="radio"
						class="mr-2 h-5 w-5"
						name="settings-theme"
						data-testid="settings-theme-{option.value}"
						checked={theme.current === option.value}
						onchange={() => switchTheme(option.value)}
						value={option.value}
					/>
					<span>{option.label}</span>
				</label>
			{/each}
		</fieldset>
	</PanelComponent>

	<PanelComponent
		heading={staticMessages.headingAccessibility}
		collapsible={false}
	>
		<fieldset>
			<legend
				class="mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200"
			>
				{staticMessages.labelNotificationTiming}
			</legend>
			{#each [{ value: 'auto-dismiss', label: staticMessages.labelNotificationTimingAuto }, { value: 'persistent', label: staticMessages.labelNotificationTimingPersistent }] satisfies { value: NotificationTimingPreference; label: string }[] as option (option.value)}
				<label
					for="settings-notification-timing-{option.value}"
					class="flex min-h-11 items-center gap-3 py-1 text-base text-stone-900 dark:text-stone-100"
				>
					<input
						id="settings-notification-timing-{option.value}"
						type="radio"
						class="h-5 w-5"
						name="settings-notification-timing"
						data-testid="settings-notification-timing-{option.value}"
						checked={notificationTiming.current === option.value}
						onchange={() => setNotificationTiming(option.value)}
						value={option.value}
					/>
					<span>{option.label}</span>
				</label>
			{/each}
		</fieldset>
	</PanelComponent>

	<ContinueCodePanel />

	<PanelComponent
		heading={staticMessages.headingAdvanced}
		initiallyCollapsed={true}
		stateKey="settings-advanced"
	>
		<div class="space-y-5">
			<div class="flex flex-wrap gap-3">
				<ButtonComponent
					size="small"
					color="red"
					testId="btn-delete-progress"
					onclick={openDeleteProgressDialog}
				>
					{staticMessages.buttonDeleteProgress}
				</ButtonComponent>
			</div>
			<DeleteProgressDialogComponent
				{locale}
				onConfirm={() => {
					clearAllProgress()
					showToast(staticMessages.alertProgressDeleted, {
						testId: 'alert-progress-cleared'
					})
				}}
				bind:this={deleteProgressDialog}
			/>

			{#if isDevEnvironment && showDevTools.current}
				<div
					class="flex flex-wrap gap-3 border-t border-stone-200 pt-4 dark:border-stone-700"
				>
					<ButtonComponent
						size="small"
						color="blue"
						testId="btn-simulate-update"
						onclick={handleSimulateUpdate}
					>
						{staticMessages.updateAvailable}
					</ButtonComponent>
				</div>
			{/if}

			<!-- Real 44px boxes rather than centred ::after overlays: two overlays this
			     close would overlap once the version string is short. -->
			<div
				class="flex items-center justify-end gap-2 border-t border-stone-200 pt-4 text-sm text-stone-700 dark:border-stone-700 dark:text-stone-300"
			>
				<button
					type="button"
					class="focus-ring inline-flex min-h-11 min-w-11 cursor-text appearance-none items-center justify-center rounded-sm border-0 bg-transparent p-0 text-sm text-stone-700 dark:text-stone-300"
					data-testid="version-tap-target"
					onclick={() =>
						handleDevTap(devTapState, Date.now(), toggleDevToolsVisibility)}
				>
					{version}
				</button>
				<a
					class="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm"
					href="https://github.com/vaags/regneflyt"
					data-testid="link-github"
					target="_blank"
					rel="noopener noreferrer"
					><span class="sr-only">{staticMessages.appGithubSr}</span><svg
						viewBox="0 0 16 16"
						class="h-4 w-4"
						fill="currentColor"
						aria-hidden="true"
						><path
							d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
						/></svg
					>
				</a>
			</div>
		</div>
	</PanelComponent>
</div>
