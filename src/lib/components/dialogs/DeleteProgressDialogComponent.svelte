<script lang="ts">
	import {
		delete_progress_confirm,
		delete_progress_message
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

	let dialog = $state<DialogComponent>(undefined!)

	export function open() {
		dialog.open()
	}
</script>

<DialogComponent
	bind:this={dialog}
	heading={delete_progress_confirm({}, { locale })}
	{locale}
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
		{delete_progress_message({}, { locale })}
	</p>
</DialogComponent>
