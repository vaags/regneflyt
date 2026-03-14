<script lang="ts">
	import * as m from '$lib/paraglide/messages.js'
	import { locales } from '$lib/paraglide/runtime.js'
	import { theme, applyTheme, type ThemePreference } from '../../stores'
	import { AppSettings } from '../../models/constants/AppSettings'
	import { slide } from 'svelte/transition'
	import { version } from '$app/environment'
	import ButtonComponent from '../widgets/ButtonComponent.svelte'
	import PanelComponent from '../widgets/PanelComponent.svelte'

	let {
		noSettingsSlide = false,
		locale,
		localeNames,
		onSwitchLocale,
		onClearDevStorage,
		onSimulateUpdate
	}: {
		noSettingsSlide?: boolean
		locale: string
		localeNames: Record<string, string>
		onSwitchLocale: (l: string) => void
		onClearDevStorage?: () => void
		onSimulateUpdate?: () => void
	} = $props()

	function switchTheme(newTheme: ThemePreference) {
		$theme = newTheme
		applyTheme(newTheme)
	}
</script>

<div
	transition:slide={{
		duration: noSettingsSlide ? 0 : AppSettings.transitionDuration.duration
	}}
>
	<PanelComponent heading={m.heading_settings()}>
		<div data-testid="settings-panel" class="space-y-5 font-sans text-sm">
			<!-- Language & Theme -->
			<div class="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3">
				<label for="settings-language" class="text-lg"
					>{m.label_language()}</label
				>
				<select
					id="settings-language"
					class="select-base w-fit cursor-pointer rounded px-2 py-1 text-sm"
					aria-label={m.label_language()}
					value={locale}
					onchange={(e) => onSwitchLocale(e.currentTarget.value)}
				>
					{#each locales as l}
						<option value={l}>{localeNames[l] ?? l.toUpperCase()}</option>
					{/each}
				</select>

				<label for="settings-theme" class="text-lg">{m.label_theme()}</label>
				<select
					id="settings-theme"
					class="select-base w-fit cursor-pointer rounded px-2 py-1 text-sm"
					aria-label={m.label_theme()}
					value={$theme}
					onchange={(e) =>
						switchTheme(e.currentTarget.value as ThemePreference)}
				>
					<option value="system">{m.theme_system()}</option>
					<option value="light">{m.theme_light()}</option>
					<option value="dark">{m.theme_dark()}</option>
				</select>
			</div>

			<!-- Dev tools -->
			{#if !AppSettings.isProduction}
				<div
					class="flex flex-wrap gap-3 border-t border-gray-200 pt-4 text-sm dark:border-gray-700"
				>
					{#if onClearDevStorage}
						<button
							class="text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
							onclick={onClearDevStorage}>{m.clear_dev_storage()}</button
						>
					{/if}
					{#if onSimulateUpdate}
						<button
							class="text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
							onclick={onSimulateUpdate}>{m.update_available()}</button
						>
					{/if}
				</div>
			{/if}

			<!-- Version & GitHub -->
			<div
				class="flex items-center justify-end border-t border-gray-200 pt-4 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
			>
				{version}
				<a
					class="ml-2 inline-block"
					href="https://github.com/vaags/regneflyt"
					target="_blank"
					rel="noreferrer"
					><span class="sr-only">{m.app_github_sr()}</span><svg
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
