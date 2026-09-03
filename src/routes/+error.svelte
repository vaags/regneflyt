<script lang="ts">
	import { page } from '$app/state'
	import { resolve } from '$app/paths'
	import {
		button_menu,
		error_boundary_message,
		error_boundary_reload,
		error_boundary_title,
		error_not_found_message,
		error_not_found_title,
		error_status_label
	} from '#lib/paraglide/messages.js'
	import PanelComponent from '#lib/components/widgets/PanelComponent.svelte'
	import ButtonComponent from '#lib/components/widgets/ButtonComponent.svelte'

	// A missing page is not a crash: reloading cannot help, so it needs its own copy.
	const isNotFound = $derived(page.status === 404)
	const title = $derived(
		isNotFound ? error_not_found_title() : error_boundary_title()
	)
	const message = $derived(
		isNotFound ? error_not_found_message() : error_boundary_message()
	)
</script>

<PanelComponent
	heading={title}
	headingTestId="error-heading"
	collapsible={false}
>
	<p class="text-lg text-stone-700 dark:text-stone-200">
		{message}
	</p>
	<!-- Labelled rather than hidden: a bare "404" reads as an unexplained number,
	     but bug reports need it and hiding it puts that out of reach. -->
	<p class="mt-2 text-stone-600 dark:text-stone-300">
		<span class="sr-only">{error_status_label()}: </span><span
			data-testid="error-status">{page.status}</span
		>
	</p>
	<div class="mt-6 flex flex-wrap gap-2">
		{#if !isNotFound}
			<ButtonComponent
				testId="btn-error-reload"
				onclick={() => location.reload()}
			>
				{error_boundary_reload()}
			</ButtonComponent>
		{/if}
		<!-- An anchor, so recovery works even if hydration is what broke, and the
		     browser's own link affordances (open in new tab, copy) keep working. -->
		<ButtonComponent
			href={resolve('/')}
			variant={isNotFound ? 'solid' : 'outline'}
			testId="btn-error-menu"
		>
			{button_menu()}
		</ButtonComponent>
	</div>
</PanelComponent>
