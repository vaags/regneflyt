<script lang="ts">
	import {
		complete_confirm,
		complete_confirm_message
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
	heading={complete_confirm({}, { locale })}
	headingTestId="complete-dialog-heading"
	confirmColor="green"
	{onConfirm}
	confirmTestId="btn-complete-yes"
	dismissTestId="btn-complete-no"
>
	<p
		class="mb-6 text-lg text-stone-700 dark:text-stone-300"
		data-testid="complete-confirm-message"
	>
		{complete_confirm_message({}, { locale })}
	</p>
</DialogComponent>
