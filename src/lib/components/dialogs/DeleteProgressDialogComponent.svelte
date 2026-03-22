<script lang="ts">
	import {
		delete_progress_confirm,
		delete_progress_message
	} from '$lib/paraglide/messages.js'
	import DialogComponent from '../widgets/DialogComponent.svelte'

	let { onConfirm = () => {} }: { onConfirm?: () => void } = $props()

	let dialog = $state<DialogComponent>(undefined!)

	export function open() {
		dialog.open()
	}
</script>

<DialogComponent
	bind:this={dialog}
	heading={delete_progress_confirm()}
	headingTestId="delete-progress-dialog-heading"
	confirmColor="red"
	{onConfirm}
	confirmTestId="btn-delete-progress-yes"
	dismissTestId="btn-delete-progress-no"
>
	<p
		class="mb-6 text-lg text-stone-700 dark:text-stone-300"
		data-testid="delete-progress-message"
	>
		{delete_progress_message()}
	</p>
</DialogComponent>
