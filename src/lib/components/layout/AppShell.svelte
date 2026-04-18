<script lang="ts">
	import type { Snippet } from 'svelte'
	import {
		app_title,
		button_close,
		button_menu,
		heading_skill_level,
		sr_skip_to_content,
		storage_write_error,
		sw_registration_error
	} from '$lib/paraglide/messages.js'
	import type { Locale } from '$lib/paraglide/runtime.js'
	import {
		lastResults,
		overallSkill,
		storageWriteError,
		swRegistrationError
	} from '$lib/stores'
	import type { QuizLeaveNavigationPath } from '$lib/helpers/quiz/quizLeaveNavigationHelper'

	let {
		children,
		contentLayout = 'default',
		locale,
		onOpenSkillDialog,
		onRequestHeaderNavigation,
		bottomNavSnippet,
		bottomNavSize = 'compact'
	}: {
		children: Snippet
		contentLayout?: 'default' | 'bottom'
		locale: Locale
		onOpenSkillDialog: () => void | Promise<void>
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
		class="font-handwriting pointer-events-none z-10 flex items-end justify-between [view-transition-name:header]"
	>
		<div class="min-h-11 min-w-11 md:min-h-12 md:min-w-12">
			{#if overallSkill.current || lastResults.current}
				<button
					class="pointer-events-auto min-h-11 min-w-11 text-3xl text-amber-900 transition-colors hover:text-amber-800 md:text-4xl dark:text-amber-100 dark:hover:text-amber-200"
					data-testid="btn-skill"
					title={heading_skill_level({}, { locale })}
					onclick={onOpenSkillDialog}
				>
					{overallSkill.current}%
				</button>
			{/if}
		</div>
		<div class="text-right">
			<h1
				class="text-4xl text-orange-700 drop-shadow-sm md:text-5xl dark:text-orange-500 dark:drop-shadow-md"
			>
				<a
					class="pointer-events-auto relative inline-flex min-h-11 items-center no-underline after:absolute after:top-1/2 after:left-1/2 after:min-h-11 after:min-w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']"
					href="/"
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
				class="min-h-8 min-w-8 shrink-0 rounded text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
				aria-label={button_close({}, { locale })}
				onclick={() => storageWriteError.set(false)}>×</button
			>
		</div>
	{/if}

	{#if swRegistrationError.current}
		<div
			role="alert"
			class="mt-2 flex items-center justify-between gap-2 rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-900 ring-1 ring-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-700"
		>
			<span>{sw_registration_error({}, { locale })}</span>
			<button
				class="min-h-8 min-w-8 shrink-0 rounded text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
				aria-label={button_close({}, { locale })}
				onclick={() => swRegistrationError.set(false)}>×</button
			>
		</div>
	{/if}

	<main id="main-content" class={mainClass}>
		{@render children()}
	</main>

	{@render bottomNavSnippet()}
</div>
