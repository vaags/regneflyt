<script lang="ts">
	import type { Snippet } from 'svelte'
	import {
		app_title,
		button_close,
		button_menu,
		heading_settings,
		heading_skill_level,
		sr_open_settings,
		sr_skip_to_content,
		storage_write_error
	} from '$lib/paraglide/messages.js'
	import { lastResults, overallSkill, storageWriteError } from '$lib/stores'
	import type { QuizLeaveNavigationPath } from '$lib/helpers/quizLeaveNavigationHelper'

	let {
		children,
		isSettingsRoute,
		onOpenSkillDialog,
		onRequestHeaderNavigation
	}: {
		children: Snippet
		isSettingsRoute: boolean
		onOpenSkillDialog: () => void | Promise<void>
		onRequestHeaderNavigation: (path: QuizLeaveNavigationPath) => void
	} = $props()
</script>

<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-sky-700 focus:shadow dark:focus:bg-stone-800 dark:focus:text-sky-300"
>
	{sr_skip_to_content()}
</a>

<div
	class="container mx-auto flex min-h-screen max-w-lg min-w-min flex-col px-2 py-2 md:max-w-xl md:px-4 md:py-3"
>
	<header
		class="font-handwriting pointer-events-none z-10 flex items-end justify-between"
		style="view-transition-name: header"
	>
		<div>
			{#if $overallSkill || $lastResults}
				<button
					class="pointer-events-auto min-h-11 min-w-11 text-3xl text-amber-900 transition-colors hover:text-amber-800 md:text-4xl dark:text-amber-100 dark:hover:text-amber-200"
					data-testid="btn-skill"
					title={heading_skill_level()}
					onclick={onOpenSkillDialog}
				>
					{$overallSkill}%
				</button>
			{/if}
		</div>
		<div class="text-right">
			<div class="flex items-center justify-end gap-3">
				<h1
					class="-mr-3 text-4xl text-orange-700 drop-shadow-sm md:text-5xl dark:text-orange-500 dark:drop-shadow-md"
				>
					<a
						class="pointer-events-auto no-underline"
						href="/"
						data-testid="link-logo-menu"
						title={button_menu()}
						onclick={(event) => {
							event.preventDefault()
							onRequestHeaderNavigation('/')
						}}
					>
						{app_title()}
					</a>
				</h1>
				<a
					class="pointer-events-auto flex min-h-11 min-w-11 items-center justify-center transition-colors {isSettingsRoute
						? 'text-stone-900 dark:text-stone-100'
						: 'text-stone-600 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'}"
					data-testid="btn-settings"
					href="/settings"
					title={heading_settings()}
					aria-label={sr_open_settings()}
					aria-current={isSettingsRoute ? 'page' : undefined}
					onclick={(event) => {
						event.preventDefault()
						onRequestHeaderNavigation('/settings')
					}}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="4" y1="6" x2="20" y2="6" />
						<line x1="4" y1="12" x2="20" y2="12" />
						<line x1="4" y1="18" x2="20" y2="18" />
						<circle cx="8" cy="6" r="2" fill="currentColor" />
						<circle cx="16" cy="12" r="2" fill="currentColor" />
						<circle cx="10" cy="18" r="2" fill="currentColor" />
					</svg>
				</a>
			</div>
		</div>
	</header>

	{#if $storageWriteError}
		<div
			role="alert"
			class="mt-2 flex items-center justify-between gap-2 rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-900 ring-1 ring-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-700"
		>
			<span>{storage_write_error()}</span>
			<button
				class="min-h-8 min-w-8 shrink-0 rounded text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
				aria-label={button_close()}
				onclick={() => storageWriteError.set(false)}>×</button
			>
		</div>
	{/if}

	<main
		id="main-content"
		class="mb-3 flex-1"
		style="view-transition-name: main-content"
	>
		{@render children()}
	</main>
</div>
