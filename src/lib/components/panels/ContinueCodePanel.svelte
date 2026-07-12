<script lang="ts">
	import {
		alert_invalid_progress_code,
		button_copy_progress_code,
		button_show_progress_code,
		button_load_progress_code,
		confirm_load_progress_code_message,
		heading_progress_code,
		label_your_progress_code,
		placeholder_progress_code,
		text_progress_code_help,
		toast_progress_code_copied,
		toast_progress_code_copy_error,
		toast_progress_code_loaded
	} from '$lib/paraglide/messages.js'
	import { adaptiveSkills, showToast } from '$lib/stores'
	import {
		decodeProgressCode,
		encodeProgressCode
	} from '$lib/helpers/continueCodeHelper'
	import { copyTextWithFeedback } from '$lib/helpers/layout/layoutActionsHelper'
	import PanelComponent from '$lib/components/widgets/PanelComponent.svelte'
	import ButtonComponent from '$lib/components/widgets/ButtonComponent.svelte'
	import AlertComponent from '$lib/components/widgets/AlertComponent.svelte'
	import DialogComponent from '$lib/components/widgets/DialogComponent.svelte'

	let inputValue = $state('')
	let showInvalidCodeError = $state(false)
	let showDialog = $state<DialogComponent | undefined>(undefined)
	let loadDialog = $state<DialogComponent | undefined>(undefined)

	let currentCode = $derived(encodeProgressCode(adaptiveSkills.current))

	function openShowDialog() {
		showDialog?.open()
	}

	function openLoadDialog() {
		showInvalidCodeError = false
		loadDialog?.open()
	}

	function handleCopy() {
		void copyTextWithFeedback(currentCode, {
			writeText: navigator.clipboard?.writeText?.bind(navigator.clipboard),
			onSuccess: () => {
				showToast(toast_progress_code_copied(), {
					testId: 'toast-progress-code-copied'
				})
			},
			onError: () => {
				showToast(toast_progress_code_copy_error(), { variant: 'error' })
			},
			logError: () => {}
		})
	}

	function handleLoadRequest() {
		const decoded = decodeProgressCode(inputValue)
		if (!decoded) {
			showInvalidCodeError = true
			return
		}

		showInvalidCodeError = false
		adaptiveSkills.current = decoded
		inputValue = ''
		loadDialog?.close()
		showToast(toast_progress_code_loaded(), {
			testId: 'toast-progress-code-loaded'
		})
	}
</script>

<PanelComponent heading={heading_progress_code()} collapsible={false}>
	<p class="mb-4 text-sm text-stone-600 dark:text-stone-300">
		{text_progress_code_help()}
	</p>
	<div class="flex flex-wrap gap-2">
		<ButtonComponent
			size="small"
			color="blue"
			title={button_show_progress_code()}
			testId="btn-show-progress-code"
			onclick={openShowDialog}
		>
			{button_show_progress_code()}
		</ButtonComponent>
		<ButtonComponent
			size="small"
			color="green"
			title={button_load_progress_code()}
			testId="btn-load-progress-code"
			onclick={openLoadDialog}
		>
			{button_load_progress_code()}
		</ButtonComponent>
	</div>
</PanelComponent>

<DialogComponent
	bind:this={showDialog}
	heading={button_show_progress_code()}
	headingTestId="show-progress-code-heading"
>
	<div>
		<label
			for="your-progress-code"
			class="text-sm text-stone-600 dark:text-stone-300"
		>
			{label_your_progress_code()}
		</label>
		<div class="mt-1 flex flex-wrap items-center gap-2">
			<input
				id="your-progress-code"
				type="text"
				readonly
				data-testid="progress-code-display"
				class="w-32 rounded-md bg-stone-100 px-3 py-2 text-lg tracking-wider text-stone-900 dark:bg-stone-800 dark:text-stone-100"
				value={currentCode}
				onfocus={(e) => e.currentTarget.select()}
			/>
			<ButtonComponent
				size="small"
				color="blue"
				title={button_copy_progress_code()}
				testId="btn-copy-progress-code"
				onclick={handleCopy}
			>
				{button_copy_progress_code()}
			</ButtonComponent>
		</div>
	</div>
</DialogComponent>

<DialogComponent
	bind:this={loadDialog}
	heading={button_load_progress_code()}
	headingTestId="load-progress-code-heading"
>
	<form
		class="flex flex-col gap-3"
		onsubmit={(e) => {
			e.preventDefault()
			handleLoadRequest()
		}}
	>
		<div>
			<label
				class="mb-1 block text-sm text-stone-600 dark:text-stone-300"
				for="progress-code-input"
			>
				{placeholder_progress_code()}
			</label>
			<input
				id="progress-code-input"
				type="text"
				data-testid="input-progress-code"
				class="w-full rounded-md px-3 py-2 text-lg"
				bind:value={inputValue}
			/>
		</div>

		<p
			class="text-sm text-stone-600 dark:text-stone-300"
			data-testid="load-progress-code-warning"
		>
			{confirm_load_progress_code_message()}
		</p>

		{#if showInvalidCodeError}
			<AlertComponent color="red"
				>{alert_invalid_progress_code()}</AlertComponent
			>
		{/if}

		<div class="flex justify-end">
			<ButtonComponent
				size="small"
				color="green"
				title={button_load_progress_code()}
				testId="btn-confirm-load-progress-code"
				onclick={handleLoadRequest}
			>
				{button_load_progress_code()}
			</ButtonComponent>
		</div>
	</form>
</DialogComponent>
