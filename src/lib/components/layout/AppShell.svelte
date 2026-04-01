<script lang="ts">
	import type { Snippet } from 'svelte'
	import {
		app_title,
		button_close,
		button_menu,
		heading_skill_level,
		sr_skip_to_content,
		storage_write_error
	} from '$lib/paraglide/messages.js'
	import type { Locale } from '$lib/paraglide/runtime.js'
	import { lastResults, overallSkill, storageWriteError } from '$lib/stores'
	import type { QuizLeaveNavigationPath } from '$lib/helpers/quizLeaveNavigationHelper'

	let {
		children,
		belowContentSnippet = undefined,
		locale,
		onOpenSkillDialog,
		onRequestHeaderNavigation,
		bottomNavSnippet,
		bottomNavSize = 'compact'
	}: {
		children: Snippet
		belowContentSnippet?: Snippet | undefined
		locale: Locale
		onOpenSkillDialog: () => void | Promise<void>
		onRequestHeaderNavigation: (path: QuizLeaveNavigationPath) => void
		bottomNavSnippet: Snippet
		bottomNavSize?: 'none' | 'compact' | 'expanded'
	} = $props()

	let bottomNavPaddingClass = $derived.by(() => {
		if (bottomNavSize === 'none') return 'pb-0'

		return bottomNavSize === 'expanded'
			? 'pb-[22rem] md:pb-[23rem]'
			: 'pb-28 md:pb-32'
	})
</script>

<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-sky-700 focus:shadow dark:focus:bg-stone-800 dark:focus:text-sky-300"
>
	{sr_skip_to_content({}, { locale })}
</a>

<div
	class="container mx-auto flex min-h-screen max-w-lg min-w-min flex-col px-2 py-2 md:max-w-xl md:px-4 md:py-3"
>
	<header
		class="font-handwriting pointer-events-none z-10 flex items-end justify-between [view-transition-name:header]"
	>
		<div>
			{#if $overallSkill || $lastResults}
				<button
					class="pointer-events-auto min-h-11 min-w-11 text-3xl text-amber-900 transition-colors hover:text-amber-800 md:text-4xl dark:text-amber-100 dark:hover:text-amber-200"
					data-testid="btn-skill"
					title={heading_skill_level({}, { locale })}
					onclick={onOpenSkillDialog}
				>
					{$overallSkill}%
				</button>
			{/if}
		</div>
		<div class="text-right">
			<h1
				class="text-4xl text-orange-700 drop-shadow-sm md:text-5xl dark:text-orange-500 dark:drop-shadow-md"
			>
				<a
					class="pointer-events-auto no-underline"
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

	{#if $storageWriteError}
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

	<main
		id="main-content"
		class="mb-3 flex-1 [view-transition-name:main-content] {bottomNavPaddingClass}"
	>
		{@render children()}
		{#if belowContentSnippet}
			{@render belowContentSnippet()}
		{/if}
	</main>

	{@render bottomNavSnippet()}
</div>
