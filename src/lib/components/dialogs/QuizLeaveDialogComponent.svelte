<script lang="ts">
	import {
		cancel_confirm,
		quit_confirm_message
	} from '$lib/paraglide/messages.js'
	import { getLocale, type Locale } from '$lib/paraglide/runtime.js'
	import DialogComponent from '../widgets/DialogComponent.svelte'

	let {
		onConfirm = () => {},
		locale = getLocale()
	}: {
		onConfirm?: () => void
		locale?: Locale | undefined
	} = $props()

	let dialog = $state<DialogComponent | undefined>(undefined)

	export function open() {
		dialog?.open()
	}
</script>

<DialogComponent
	bind:this={dialog}
	{locale}
	heading={cancel_confirm({}, { locale })}
	headingTestId="quit-dialog-heading"
	confirmColor="red"
	{onConfirm}
	confirmTestId="btn-cancel-yes"
	dismissTestId="btn-cancel-no"
>
	<p
		class="mb-6 text-lg text-stone-700 dark:text-stone-300"
		data-testid="quit-confirm-message"
	>
		{quit_confirm_message({}, { locale })}
	</p>
</DialogComponent>
