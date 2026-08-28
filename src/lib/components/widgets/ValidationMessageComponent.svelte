<script lang="ts">
	import { slide } from 'svelte/transition'
	import { AppSettings } from '#lib/constants/AppSettings.ts'
	import AlertComponent from './AlertComponent.svelte'

	let {
		id,
		show,
		message,
		testId = undefined
	}: {
		/** Referenced by the invalid control's `aria-describedby`. */
		id: string
		show: boolean
		message: string
		testId?: string | undefined
	} = $props()
</script>

<!--
	The sole owner of the `aria-live="assertive"` attribute in the app. Other
	assertive announcements come from `role="alert"` (AlertComponent, the storage
	alert in AppShell, error toasts). The region stays mounted for as long as the
	control it describes, so `aria-describedby` always resolves and a message that
	appears while the user is on the field is announced. A collapsible panel
	unmounts both together, so an error raised while collapsed is announced on
	expand only if the screen reader picks up the insertion. `announce={false}`
	drops the role AlertComponent would otherwise add, which would announce it a
	second time.
-->
<div {id} aria-live="assertive" data-validation-message data-testid={testId}>
	{#if show}
		<div transition:slide={AppSettings.transitionDuration} class="pt-3">
			<AlertComponent color="red" announce={false}>{message}</AlertComponent>
		</div>
	{/if}
</div>
