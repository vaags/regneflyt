<script lang="ts">
	import * as m from '$lib/paraglide/messages.js'
	import { locales } from '$lib/paraglide/runtime.js'
	import {
		adaptiveSkills,
		totalCorrect,
		totalAttempted,
		theme,
		applyTheme,
		type ThemePreference
	} from '../../stores'
	import { slide } from 'svelte/transition'
	import { AppSettings } from '../../models/constants/AppSettings'
	import {
		encodeSkillCode,
		decodeSkillCode
	} from '../../helpers/skillCodeHelper'
	import ButtonComponent from '../widgets/ButtonComponent.svelte'
	import PanelComponent from '../widgets/PanelComponent.svelte'

	let {
		open = false,
		locale,
		localeNames,
		onSwitchLocale,
		onClearDevStorage,
		onSimulateUpdate
	}: {
		open: boolean
		locale: string
		localeNames: Record<string, string>
		onSwitchLocale: (l: string) => void
		onClearDevStorage?: () => void
		onSimulateUpdate?: () => void
	} = $props()

	let showImport = $state(false)
	let importCode = $state('')
	let feedback = $state('')
	let feedbackTimeout: ReturnType<typeof setTimeout> | undefined

	function showFeedback(msg: string) {
		feedback = msg
		clearTimeout(feedbackTimeout)
		feedbackTimeout = setTimeout(() => (feedback = ''), 3000)
	}

	function switchTheme(newTheme: ThemePreference) {
		$theme = newTheme
		applyTheme(newTheme)
	}

	async function exportCode() {
		const code = encodeSkillCode({
			skills: $adaptiveSkills,
			totalCorrect: $totalCorrect,
			totalAttempted: $totalAttempted
		})
		await navigator.clipboard.writeText(code)
		showFeedback(m.alert_code_copied())
	}

	function importFromCode() {
		const data = decodeSkillCode(importCode)
		if (!data) {
			showFeedback(m.alert_import_invalid())
			return
		}

		if (!confirm(m.import_confirm())) return

		$adaptiveSkills = data.skills
		$totalCorrect = data.totalCorrect
		$totalAttempted = data.totalAttempted
		importCode = ''
		showImport = false
		showFeedback(m.alert_import_success())
	}
</script>

{#if open}
	<div transition:slide={AppSettings.transitionDuration}>
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

				<!-- Import / Export -->
				<div class="border-t border-gray-200 pt-4 dark:border-gray-700">
					<span class="text-lg">{m.label_skill_code()}</span>
					<div class="mt-2 flex gap-2">
						<ButtonComponent size="small" onclick={exportCode}
							>{m.button_export()}</ButtonComponent
						>
						<ButtonComponent
							size="small"
							onclick={() => (showImport = !showImport)}
							>{m.button_import()}</ButtonComponent
						>
					</div>

					{#if showImport}
						<div class="mt-3 flex items-center gap-2">
							<input
								id="skill-code-input"
								type="text"
								class="block flex-1 rounded border border-gray-400 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
								placeholder={m.label_skill_code()}
								bind:value={importCode}
								onkeydown={(e) => {
									if (e.key === 'Enter') importFromCode()
								}}
							/>
							<ButtonComponent size="small" onclick={importFromCode}
								>{m.button_import()}</ButtonComponent
							>
						</div>
					{/if}

					{#if feedback}
						<div
							class="mt-2 text-center text-sm font-medium text-blue-700 dark:text-blue-300"
						>
							{feedback}
						</div>
					{/if}
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
			</div>
		</PanelComponent>
	</div>
{/if}
