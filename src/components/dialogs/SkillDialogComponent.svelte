<script lang="ts">
	import DialogComponent from '../widgets/DialogComponent.svelte'
	import { adaptiveSkills, totalCorrect, totalAttempted } from '../../stores'
	import * as m from '$lib/paraglide/messages.js'
	import { Operator, getOperatorLabel } from '../../models/constants/Operator'
	import { adaptiveTuning } from '../../models/AdaptiveProfile'
	import {
		encodeSkillCode,
		decodeSkillCode
	} from '../../helpers/skillCodeHelper'
	import ButtonComponent from '../widgets/ButtonComponent.svelte'

	let dialog = $state<DialogComponent>(undefined!)

	const operators = [
		Operator.Addition,
		Operator.Subtraction,
		Operator.Multiplication,
		Operator.Division
	]

	let skills = $derived(operators.map((op) => $adaptiveSkills[op] ?? 0))

	let overall = $derived(
		Math.round(
			skills.reduce((sum, s) => sum + s, 0) /
				adaptiveTuning.adaptiveAllOperatorCount
		)
	)

	let showImport = $state(false)
	let importCode = $state('')
	let feedback = $state('')
	let feedbackTimeout: ReturnType<typeof setTimeout> | undefined

	function showFeedback(msg: string) {
		feedback = msg
		clearTimeout(feedbackTimeout)
		feedbackTimeout = setTimeout(() => (feedback = ''), 3000)
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

	export function open() {
		showImport = false
		importCode = ''
		feedback = ''
		dialog.open()
	}
</script>

<DialogComponent bind:this={dialog} heading={m.heading_skill_level()}>
	<div class="mb-5">
		{#each operators as operator, i}
			<div class="mb-3">
				<div
					class="mb-1 flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
				>
					<span>{getOperatorLabel(operator)}</span>
					<span class="font-semibold">{skills[i]}%</span>
				</div>
				<div
					class="flex h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
					role="progressbar"
					aria-valuenow={skills[i]}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-label={getOperatorLabel(operator)}
				>
					<div
						class="h-2 rounded-full bg-blue-600 dark:bg-blue-400"
						style="width: {skills[i]}%"
					></div>
				</div>
			</div>
		{/each}
	</div>

	<div
		class="border-t border-gray-300 pt-3 text-center text-lg font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-200"
	>
		{m.label_total()}: {overall}%
	</div>

	{#if $totalAttempted > 0}
		<div class="mt-1 text-center text-sm text-gray-600 dark:text-gray-400">
			{m.heading_puzzles()}: {m.label_puzzles_solved({
				correct: $totalCorrect.toString(),
				attempted: $totalAttempted.toString()
			})}
		</div>
	{/if}

	<div
		class="mt-5 flex items-center justify-center gap-3 border-t border-gray-300 pt-4 dark:border-gray-700"
	>
		<ButtonComponent size="small" onclick={exportCode}
			>{m.button_export()}</ButtonComponent
		>
		<ButtonComponent size="small" onclick={() => (showImport = !showImport)}
			>{m.button_import()}</ButtonComponent
		>
	</div>

	{#if showImport}
		<div class="mt-3">
			<label
				for="skill-code-input"
				class="mb-1 block text-sm text-gray-700 dark:text-gray-300"
				>{m.label_skill_code()}</label
			>
			<div class="flex items-center gap-2">
				<input
					id="skill-code-input"
					type="text"
					class="block flex-1 rounded border border-gray-400 bg-white px-3 py-2 text-base dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
					bind:value={importCode}
					onkeydown={(e) => {
						if (e.key === 'Enter') importFromCode()
					}}
				/>
				<ButtonComponent size="small" onclick={importFromCode}
					>{m.button_import()}</ButtonComponent
				>
			</div>
		</div>
	{/if}

	{#if feedback}
		<div
			class="mt-3 text-center text-sm font-medium text-blue-700 dark:text-blue-300"
		>
			{feedback}
		</div>
	{/if}
</DialogComponent>
