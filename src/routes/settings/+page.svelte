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
	} from '#lib/paraglide/messages.js'
	import { locales } from '#lib/paraglide/runtime.js'
	import { getLocale, type Locale } from '#lib/paraglide/runtime.js'
	import { getLocaleNames } from '#lib/helpers/localeHelper.ts'
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
	} from '#lib/stores.ts'
	import {
		createDevTapState,
		handleDevTap
	} from '#lib/helpers/layout/layoutSetupHelper.ts'
	import { version } from '$app/env'
	import { getSettingsRouteContext } from '#lib/contexts/settingsRouteContext.ts'
	import { getStickyGlobalNavContext } from '#lib/contexts/stickyGlobalNavContext.ts'
	import type { DialogHandle } from '#lib/models/DialogHandle.ts'
	import PanelComponent from '#lib/components/widgets/PanelComponent.svelte'
	import ButtonComponent from '#lib/components/widgets/ButtonComponent.svelte'
	import DeleteProgressDialogComponent from '#lib/components/dialogs/DeleteProgressDialogComponent.svelte'
	import ContinueCodePanel from '#lib/components/panels/ContinueCodePanel.svelte'
	import { buildPathWithQuizQueryParams } from '#lib/helpers/urlParamsHelper.ts'

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
	class="settings"
>
	<PanelComponent heading={staticMessages.labelLanguage} collapsible={false}>
		<fieldset>
			<legend class="visually-hidden">{staticMessages.labelLanguage}</legend>
			{#each locales as l (l)}
				<label for="settings-language-{l}" class="option">
					<input
						id="settings-language-{l}"
						type="radio"
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
			<legend class="visually-hidden">{staticMessages.labelTheme}</legend>
			{#each themeOptions as option (option.value)}
				<label for="settings-theme-{option.value}" class="option">
					<input
						id="settings-theme-{option.value}"
						type="radio"
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
			<legend class="group-label">
				{staticMessages.labelNotificationTiming}
			</legend>
			{#each [{ value: 'auto-dismiss', label: staticMessages.labelNotificationTimingAuto }, { value: 'persistent', label: staticMessages.labelNotificationTimingPersistent }] satisfies { value: NotificationTimingPreference; label: string }[] as option (option.value)}
				<label
					for="settings-notification-timing-{option.value}"
					class="option"
					data-compact="true"
				>
					<input
						id="settings-notification-timing-{option.value}"
						type="radio"
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
		<div class="advanced">
			<div class="actions">
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
				<div class="actions" data-separated="true">
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
			<div class="metadata">
				<button
					type="button"
					class="focus-indicator"
					data-testid="version-tap-target"
					onclick={() =>
						handleDevTap(devTapState, Date.now(), toggleDevToolsVisibility)}
				>
					{version}
				</button>
				<a
					class="focus-indicator"
					href="https://github.com/vaags/regneflyt"
					data-testid="link-github"
					target="_blank"
					rel="noopener noreferrer"
					><span class="visually-hidden">{staticMessages.appGithubSr}</span><svg
						viewBox="0 0 16 16"
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

<style>
	.settings {
		font-family: var(--font-sans);
		font-size: 0.875rem;

		& .option {
			display: flex;
			align-items: center;
			min-block-size: var(--target-minimum);
			gap: 0.5rem;
			padding-block: 0.25rem;
			font-size: 1.125rem;

			&[data-compact='true'] {
				gap: 0.75rem;
				color: var(--color-text-primary);
				font-size: 1rem;
			}
		}

		& .group-label {
			margin-block-end: 0.5rem;
			color: var(--color-text-secondary);
			font-size: 0.875rem;
			font-weight: 600;
		}

		& .advanced {
			display: flex;
			flex-direction: column;
			gap: 1.25rem;
		}

		& .actions {
			display: flex;
			flex-wrap: wrap;
			gap: 0.75rem;

			&[data-separated='true'] {
				padding-block-start: 1rem;
				border-block-start: 1px solid var(--color-border-subtle);
			}
		}

		& .metadata {
			display: flex;
			align-items: center;
			justify-content: flex-end;
			gap: 0.5rem;
			padding-block-start: 1rem;
			border-block-start: 1px solid var(--color-border-subtle);
			color: var(--color-text-secondary);
			font-size: 0.875rem;

			& a,
			& button {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				min-inline-size: var(--target-minimum);
				min-block-size: var(--target-minimum);
				padding: 0;
				border: 0;
				border-radius: 0.125rem;
				background: transparent;
				color: inherit;
				font-size: 0.875rem;
				text-decoration: none;
			}

			& button {
				appearance: none;
				cursor: text;
			}

			& svg {
				inline-size: 1rem;
				block-size: 1rem;
			}
		}
	}
</style>
