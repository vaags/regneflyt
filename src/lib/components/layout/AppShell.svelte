<script lang="ts">
	import type { Snippet } from 'svelte'
	import { resolve } from '$app/paths'
	import {
		app_title,
		button_close,
		button_menu,
		sr_skip_to_content,
		storage_write_error
	} from '#lib/paraglide/messages.js'
	import type { Locale } from '#lib/paraglide/runtime.js'
	import { storageWriteError } from '#lib/stores.ts'
	import type { QuizLeaveNavigationPath } from '#lib/helpers/quiz/quizLeaveNavigationHelper.ts'

	let {
		children,
		contentLayout = 'default',
		locale,
		onRequestHeaderNavigation,
		bottomNavSnippet,
		bottomNavSize = 'compact'
	}: {
		children: Snippet
		contentLayout?: 'default' | 'bottom'
		locale: Locale
		onRequestHeaderNavigation: (path: QuizLeaveNavigationPath) => void
		bottomNavSnippet: Snippet
		bottomNavSize?: 'none' | 'compact' | 'expanded'
	} = $props()

	let logoText = $derived(app_title({}, { locale }))
</script>

<a href="#main-content" class="skip-link focus-indicator">
	{sr_skip_to_content({}, { locale })}
</a>

<div class="shell" data-content-layout={contentLayout}>
	<header class="header">
		<div class="header__content">
			<h1 class="logo">
				<a
					class="logo__link focus-indicator expanded-hit-area"
					href={resolve('/')}
					data-testid="link-logo-menu"
					title={button_menu({}, { locale })}
					aria-label={logoText}
					onclick={(event) => {
						event.preventDefault()
						onRequestHeaderNavigation('/')
					}}
				>
					{logoText}
				</a>
			</h1>
		</div>
	</header>

	{#if storageWriteError.current}
		<div role="alert" data-testid="storage-write-alert" class="storage-alert">
			<span>{storage_write_error({}, { locale })}</span>
			<button
				type="button"
				data-testid="btn-storage-write-alert-close"
				class="storage-alert__close focus-indicator expanded-hit-area"
				aria-label={button_close({}, { locale })}
				onclick={() => storageWriteError.set(false)}>×</button
			>
		</div>
	{/if}

	<!-- tabindex lets the skip link and post-navigation focus land here without
	     adding <main> to the tab order; the outline is suppressed because <main>
	     is a focus destination, not an operable control. -->
	<main
		id="main-content"
		class="main-content"
		data-content-layout={contentLayout}
		data-bottom-nav-size={bottomNavSize}
		tabindex="-1"
	>
		{@render children()}
	</main>

	{@render bottomNavSnippet()}
</div>

<style>
	.skip-link {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		padding: 0;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.skip-link:focus {
		position: absolute;
		top: 0.5rem;
		left: 0.5rem;
		z-index: 50;
		inline-size: auto;
		block-size: auto;
		padding: 0.5rem 1rem;
		overflow: visible;
		clip: auto;
		border-radius: 0.25rem;
		background: var(--color-surface-raised);
		color: var(--color-primary-700);
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.12);
	}

	.shell {
		display: flex;
		flex-direction: column;
		inline-size: 100%;
		min-inline-size: 0;
		min-block-size: 100dvh;
		max-inline-size: 32rem;
		margin-inline: auto;
		padding-inline: 0.5rem;
		padding-block: 0.5rem;
	}

	.shell[data-content-layout='bottom'] {
		padding-block-end: 0;
	}

	.header {
		z-index: 10;
		display: flex;
		align-items: flex-end;
		justify-content: flex-end;
		pointer-events: none;
		view-transition-name: header;
	}

	.header__content {
		text-align: end;
	}

	.logo {
		color: #c2410c;
		font-family: var(--font-logo);
		font-size: 2.25rem;
		font-weight: 400;
		line-height: 2.5rem;
		filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.05));
	}

	.logo__link {
		display: inline-flex;
		align-items: center;
		min-block-size: var(--target-minimum);
		color: inherit;
		text-decoration: none;
		pointer-events: auto;
	}

	.storage-alert {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-block-start: 0.5rem;
		padding: 0.5rem 1rem;
		border: 1px solid var(--color-warning-300);
		border-radius: var(--radius-control);
		background: var(--color-warning-50);
		color: var(--color-warning-900);
		font-size: 0.875rem;
	}

	.storage-alert__close {
		min-inline-size: 2rem;
		min-block-size: 2rem;
		flex: none;
		border-radius: 0.25rem;
		background: transparent;
		color: var(--color-warning-700);
	}

	.storage-alert__close:hover {
		color: var(--color-warning-900);
	}

	.main-content {
		flex: 1;
		margin-block-end: 0.75rem;
		outline: none;
		view-transition-name: main-content;
	}

	.main-content[data-content-layout='bottom'] {
		display: flex;
		flex-direction: column;
		margin-block-end: 0;
	}

	.main-content[data-bottom-nav-size='compact'] {
		padding-block-end: 7rem;
	}

	.main-content[data-bottom-nav-size='expanded'] {
		padding-block-end: var(
			--measured-global-nav-height,
			var(--sticky-global-nav-expanded-clearance)
		);
	}

	:global(.dark) .logo {
		color: #f97316;
		filter: drop-shadow(0 4px 3px rgb(0 0 0 / 0.12));
	}

	:global(.dark) .storage-alert {
		border-color: var(--color-warning-700);
		background: var(--color-warning-950);
		color: var(--color-warning-200);
	}

	:global(.dark) .storage-alert__close {
		color: var(--color-warning-300);
	}

	:global(.dark) .storage-alert__close:hover {
		color: var(--color-warning-100);
	}

	@media (min-width: 48rem) {
		.shell {
			max-inline-size: 36rem;
			padding-inline: 1rem;
			padding-block: 0.75rem;
		}

		.shell[data-content-layout='bottom'] {
			padding-block-end: 0;
		}

		.logo {
			font-size: 3rem;
			line-height: 1;
		}

		.main-content[data-bottom-nav-size='compact'] {
			padding-block-end: 8rem;
		}
	}
</style>
