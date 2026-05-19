<script lang="ts">
	import {
		delete_progress_confirm,
		delete_progress_message
	} from '$lib/paraglide/messages.js'
	import { getLocale, type Locale } from '$lib/paraglide/runtime.js'
	import ConfirmDialogComponent from './ConfirmDialogComponent.svelte'

	let {
		onConfirm = () => {},
		locale = getLocale()
	}: {
		onConfirm?: () => void
		locale?: Locale | undefined
	} = $props()

	let dialog = $state<ConfirmDialogComponent | undefined>(undefined)

	export function open() {
		dialog?.open()
	}
</script>

<ConfirmDialogComponent
	bind:this={dialog}
	heading={delete_progress_confirm({}, { locale })}
	{locale}
	headingTestId="delete-progress-dialog-heading"
	confirmColor="red"
	{onConfirm}
	confirmTestId="btn-delete-progress-yes"
	dismissTestId="btn-delete-progress-no"
	message={delete_progress_message({}, { locale })}
	messageTestId="delete-progress-message"
></ConfirmDialogComponent>
