<script lang="ts">
	import DialogComponent from '$lib/components/widgets/DialogComponent.svelte'

	let dialog = $state<DialogComponent>(undefined!)
	const onConfirm = () => {}
</script>

<button data-testid="dialog-open" onclick={() => dialog.open()}>Open</button>

<DialogComponent
	bind:this={dialog}
	heading="Confirm action"
	headingTestId="dialog-heading"
	confirmColor="green"
	{onConfirm}
	confirmTestId="dialog-confirm"
	dismissTestId="dialog-dismiss"
>
	<p data-testid="dialog-content">Dialog content</p>
	<input data-testid="dialog-input" type="text" autocomplete="off" />
</DialogComponent>
