<script lang="ts">
	import {
		complete_confirm,
		complete_confirm_message
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
	heading={complete_confirm({}, { locale })}
	headingTestId="complete-dialog-heading"
	confirmColor="green"
	{onConfirm}
	confirmTestId="btn-complete-yes"
	dismissTestId="btn-complete-no"
	message={complete_confirm_message({}, { locale })}
	messageTestId="complete-confirm-message"
></ConfirmDialogComponent>
