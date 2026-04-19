<script lang="ts">
	import type { Snippet } from 'svelte'
	import { resolve } from '$app/paths'
	import {
		app_title,
		button_close,
		button_menu,
		sr_skip_to_content,
		storage_write_error
	} from '$lib/paraglide/messages.js'
	import type { Locale } from '$lib/paraglide/runtime.js'
	import { storageWriteError } from '$lib/stores'
	import type { QuizLeaveNavigationPath } from '$lib/helpers/quiz'

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

	const shellBaseClass =
		'container mx-auto flex min-h-dvh max-w-lg min-w-min flex-col px-2 md:max-w-xl md:px-4'
	const mainContentBaseClass = '[view-transition-name:main-content]'

	let bottomNavPaddingClass = $derived.by(() => {
		if (bottomNavSize === 'none') return 'pb-0'

		return bottomNavSize === 'expanded'
			? 'pb-[var(--measured-global-nav-height,var(--sticky-global-nav-expanded-clearance))]'
			: 'pb-28 md:pb-32'
	})

	let shellClass = $derived(
		contentLayout === 'bottom'
			? `${shellBaseClass} pt-2 md:pt-3`
			: `${shellBaseClass} py-2 md:py-3`
	)

	let mainClass = $derived(
		contentLayout === 'bottom'
			? `flex flex-col flex-1 ${mainContentBaseClass} ${bottomNavPaddingClass}`
			: `mb-3 flex-1 ${mainContentBaseClass} ${bottomNavPaddingClass}`
	)
</script>

<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-sky-700 focus:shadow dark:focus:bg-stone-800 dark:focus:text-sky-300"
>
	{sr_skip_to_content({}, { locale })}
</a>

<div class={shellClass}>
	<header
		class="font-handwriting pointer-events-none z-10 flex items-end justify-end [view-transition-name:header]"
	>
		<div class="text-right">
			<h1
				class="text-4xl text-orange-700 drop-shadow-sm md:text-5xl dark:text-orange-500 dark:drop-shadow-md"
			>
				<a
					class="pointer-events-auto relative inline-flex min-h-11 items-center no-underline after:absolute after:top-1/2 after:left-1/2 after:min-h-11 after:min-w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']"
					href={resolve('/')}
					data-testid="link-logo-menu"
					title={button_menu({}, { locale })}
					onclick={(event) => {
						event.preventDefault()
						onRequestHeaderNavigation('/')
					}}
				>
					{app_title({}, { locale })}
				</a>
			</h1>
		</div>
	</header>

	{#if storageWriteError.current}
		<div
			role="alert"
			class="mt-2 flex items-center justify-between gap-2 rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-900 ring-1 ring-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-700"
		>
			<span>{storage_write_error({}, { locale })}</span>
			<button
				type="button"
				class="min-h-8 min-w-8 shrink-0 rounded text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
				aria-label={button_close({}, { locale })}
				onclick={() => storageWriteError.set(false)}>×</button
			>
		</div>
	{/if}

	<main id="main-content" class={mainClass}>
		{@render children()}
	</main>

	{@render bottomNavSnippet()}
</div>
