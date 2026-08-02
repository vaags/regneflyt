<script lang="ts">
	import { getLocale, type Locale } from '$lib/paraglide/runtime.js'
	import DialogComponent from '../widgets/DialogComponent.svelte'

	let {
		onConfirm = () => {},
		locale = getLocale(),
		heading,
		headingTestId,
		confirmColor,
		confirmTestId,
		dismissTestId,
		message,
		messageTestId,
		initialFocus = 'close'
	}: {
		onConfirm?: () => void
		locale?: Locale | undefined
		heading: string
		headingTestId: string
		confirmColor: 'red' | 'blue' | 'green' | 'gray'
		confirmTestId: string
		dismissTestId: string
		message: string
		messageTestId: string
		initialFocus?: 'close' | 'dismiss'
	} = $props()

	let dialog = $state<DialogComponent | undefined>(undefined)

	export function open() {
		dialog?.open()
	}
</script>

<DialogComponent
	bind:this={dialog}
	{locale}
	{heading}
	{headingTestId}
	{confirmColor}
	{onConfirm}
	{confirmTestId}
	{dismissTestId}
	{initialFocus}
>
	<p
		class="mb-6 text-lg text-stone-700 dark:text-stone-200"
		data-testid={messageTestId}
	>
		{message}
	</p>
</DialogComponent>
