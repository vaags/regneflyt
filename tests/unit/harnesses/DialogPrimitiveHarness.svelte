<script lang="ts">
	import DialogComponent from '#lib/components/widgets/DialogComponent.svelte'

	let { initialFocus = 'close' }: { initialFocus?: 'close' | 'dismiss' } =
		$props()

	let dialog = $state<DialogComponent>(undefined!)
	const onConfirm = () => {}
</script>

<button type="button" data-testid="dialog-open" onclick={() => dialog.open()}
	>Open</button
>

<DialogComponent
	bind:this={dialog}
	heading="Confirm action"
	headingTestId="dialog-heading"
	confirmColor="green"
	{onConfirm}
	confirmTestId="dialog-confirm"
	dismissTestId="dialog-dismiss"
	{initialFocus}
>
	<p data-testid="dialog-content">Dialog content</p>
	<input data-testid="dialog-input" type="text" autocomplete="off" />
</DialogComponent>
