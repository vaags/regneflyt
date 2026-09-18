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
	<p class="error-page__message">
		{message}
	</p>
	<!-- Labelled rather than hidden: a bare "404" reads as an unexplained number,
	     but bug reports need it and hiding it puts that out of reach. -->
	<p class="error-page__status">
		<span class="visually-hidden">{error_status_label()}: </span><span
			data-testid="error-status">{page.status}</span
		>
	</p>
	<div class="error-page__actions">
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

<style>
	.error-page__message {
		color: var(--color-text-secondary);
		font-size: 1.125rem;
	}

	.error-page__status {
		margin-block-start: 0.5rem;
		color: var(--color-text-muted);
	}

	.error-page__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-block-start: 1.5rem;
	}
</style>
