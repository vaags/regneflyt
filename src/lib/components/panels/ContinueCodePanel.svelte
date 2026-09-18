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
	} from '#lib/paraglide/messages.js'
	import { operatorSkills, showToast } from '#lib/stores.ts'
	import {
		decodeProgressCode,
		encodeProgressCode
	} from '#lib/helpers/continueCodeHelper.ts'
	import { copyTextWithFeedback } from '#lib/helpers/layout/layoutActionsHelper.ts'
	import PanelComponent from '#lib/components/widgets/PanelComponent.svelte'
	import ButtonComponent from '#lib/components/widgets/ButtonComponent.svelte'
	import ValidationMessageComponent from '#lib/components/widgets/ValidationMessageComponent.svelte'
	import DialogComponent from '#lib/components/widgets/DialogComponent.svelte'

	let inputValue = $state('')
	let showInvalidCodeError = $state(false)
	let showDialog = $state<DialogComponent | undefined>(undefined)
	let loadDialog = $state<DialogComponent | undefined>(undefined)

	const codeErrorId = 'progress-code-input-error'

	let currentCode = $derived(encodeProgressCode(operatorSkills.current))

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
		operatorSkills.current = decoded
		inputValue = ''
		loadDialog?.close()
		showToast(toast_progress_code_loaded(), {
			testId: 'toast-progress-code-loaded'
		})
	}
</script>

<PanelComponent heading={heading_progress_code()} collapsible={false}>
	<p class="progress-code__help">
		{text_progress_code_help()}
	</p>
	<div class="progress-code__actions">
		<ButtonComponent
			size="small"
			color="blue"
			testId="btn-show-progress-code"
			onclick={openShowDialog}
		>
			{button_show_progress_code()}
		</ButtonComponent>
		<ButtonComponent
			size="small"
			color="green"
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
		<label for="your-progress-code" class="progress-code__label">
			{label_your_progress_code()}
		</label>
		<div class="progress-code__display-row">
			<input
				id="your-progress-code"
				type="text"
				readonly
				data-testid="progress-code-display"
				class="progress-code__display"
				value={currentCode}
				onfocus={(e) => e.currentTarget.select()}
			/>
			<ButtonComponent
				size="small"
				color="blue"
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
		class="progress-code__form"
		onsubmit={(e) => {
			e.preventDefault()
			handleLoadRequest()
		}}
	>
		<div>
			<label
				class="progress-code__label progress-code__label--block"
				for="progress-code-input"
			>
				{placeholder_progress_code()}
			</label>
			<input
				id="progress-code-input"
				type="text"
				data-testid="input-progress-code"
				class="progress-code__input"
				autocomplete="off"
				autocapitalize="none"
				autocorrect="off"
				spellcheck="false"
				aria-invalid={showInvalidCodeError ? 'true' : undefined}
				aria-describedby={showInvalidCodeError ? codeErrorId : undefined}
				bind:value={inputValue}
			/>
		</div>

		<p class="progress-code__warning" data-testid="load-progress-code-warning">
			{confirm_load_progress_code_message()}
		</p>

		<ValidationMessageComponent
			id={codeErrorId}
			testId={codeErrorId}
			show={showInvalidCodeError}
			message={alert_invalid_progress_code()}
		/>

		<div class="progress-code__confirm">
			<ButtonComponent
				size="small"
				color="green"
				testId="btn-confirm-load-progress-code"
				onclick={handleLoadRequest}
			>
				{button_load_progress_code()}
			</ButtonComponent>
		</div>
	</form>
</DialogComponent>

<style>
	.progress-code__help {
		margin-block-end: 1rem;
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}

	.progress-code__actions,
	.progress-code__display-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.progress-code__label,
	.progress-code__warning {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}

	.progress-code__label--block {
		display: block;
		margin-block-end: 0.25rem;
	}

	.progress-code__display-row {
		margin-block-start: 0.25rem;
	}

	.progress-code__display {
		inline-size: 8rem;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-control);
		background: var(--color-surface);
		color: var(--color-text-primary);
		font-size: 1.125rem;
		letter-spacing: 0.05em;
	}

	.progress-code__form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.progress-code__input {
		inline-size: 100%;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-control);
		font-size: 1.125rem;
	}

	.progress-code__confirm {
		display: flex;
		justify-content: flex-end;
	}
</style>
