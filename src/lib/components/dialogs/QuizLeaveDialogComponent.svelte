<script lang="ts">
	import {
		cancel_confirm,
		quit_confirm_message
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
	{locale}
	heading={cancel_confirm({}, { locale })}
	headingTestId="quit-dialog-heading"
	confirmColor="red"
	{onConfirm}
	confirmTestId="btn-cancel-yes"
	dismissTestId="btn-cancel-no"
	message={quit_confirm_message({}, { locale })}
	messageTestId="quit-confirm-message"
></ConfirmDialogComponent>
