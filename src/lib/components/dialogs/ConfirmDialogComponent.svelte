<script lang="ts">
	import { getLocale, type Locale } from '#lib/paraglide/runtime.js'
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
	<p class="confirm-dialog__message" data-testid={messageTestId}>
		{message}
	</p>
</DialogComponent>

<style>
	.confirm-dialog__message {
		margin-block-end: 1.5rem;
		color: var(--color-text-secondary);
		font-size: 1.125rem;
	}
</style>
