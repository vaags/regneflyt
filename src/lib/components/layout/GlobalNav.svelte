<script lang="ts">
	import { onMount } from 'svelte'
	import {
		button_replay,
		button_start,
		button_copy_link,
		button_menu,
		heading_results,
		heading_settings,
		label_copy_link_same_puzzles
	} from '$lib/paraglide/messages.js'
	import type { Locale } from '$lib/paraglide/runtime.js'
	import type { StickyGlobalNavQuizControls } from '$lib/contexts/stickyGlobalNavContext'
	import { fly, slide } from 'svelte/transition'
	import { cubicIn, cubicOut, sineInOut } from 'svelte/easing'
	import { AppSettings } from '$lib/constants/AppSettings'
	import LinkComponent from '$lib/components/icons/LinkComponent.svelte'
	import NumpadComponent from '$lib/components/widgets/NumpadComponent.svelte'
	import SplitButtonComponent from '$lib/components/widgets/SplitButtonComponent.svelte'

	let {
		locale,
		pathname,
		mode = 'default',
		quizControls = undefined,
		retainQuizControls = false,
		transitionName = undefined,
		onStart,
		onReplay = undefined,
		onNavigateMenu,
		onNavigateResults,
		onNavigateSettings,
		onCopyLink,
		onCopyDeterministicLink
	}: {
		locale: Locale
		pathname: string
		mode?: 'default' | 'quiz'
		quizControls?: StickyGlobalNavQuizControls | undefined
		retainQuizControls?: boolean
		transitionName?: string | undefined
		onStart: () => void
		onReplay?: (() => void) | undefined
		onNavigateMenu: () => void
		onNavigateResults: () => void
		onNavigateSettings: () => void
		onCopyLink: () => void | Promise<void>
		onCopyDeterministicLink?: (() => void | Promise<void>) | undefined
	} = $props()

	const navButtonClass =
		'min-h-11 min-w-11 rounded-md px-2 py-2 transition-[transform,background-color,color,box-shadow] duration-200 ease-out active:translate-y-px active:shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-100 dark:focus-visible:ring-sky-400 dark:focus-visible:ring-offset-stone-900'
	const navButtonActiveClass =
		'bg-sky-50 text-sky-900 ring-1 ring-sky-600 dark:bg-sky-900/40 dark:text-sky-50 dark:ring-sky-500'
	const navButtonInactiveClass =
		'text-stone-800 hover:bg-stone-200 dark:text-stone-200 dark:hover:bg-stone-800'

	const navButtonClassForPath = (targetPath: string) =>
		`${navButtonClass} ${pathname === targetPath ? navButtonActiveClass : navButtonInactiveClass}`
	const enterTransitionDuration = Math.round(
		AppSettings.transitionDuration.duration * 0.9
	)
	const exitTransitionDuration = Math.round(
		AppSettings.transitionDuration.duration * 0.8
	)
	let retainedQuizControls = $state<StickyGlobalNavQuizControls | undefined>(
		undefined
	)

	$effect(() => {
		if (quizControls !== undefined) {
			retainedQuizControls = quizControls
		} else if (!retainQuizControls) {
			retainedQuizControls = undefined
		}
	})

	const renderControls = $derived(
		quizControls ?? (retainQuizControls ? retainedQuizControls : undefined)
	)
	const showQuizTray = $derived(mode === 'quiz' && !!renderControls)
	const showPrimaryActions = $derived(mode !== 'quiz')
	let hasDeterministicCopyAction = $derived(!!onCopyDeterministicLink)
	const startLabel = $derived(button_start({}, { locale }))
	const replayLabel = $derived(button_replay({}, { locale }))

	let navElement = $state<HTMLElement | undefined>(undefined)
	let measureNavHeightFrame: number | undefined = undefined

	function syncMeasuredNavHeight() {
		if (!navElement) return

		const navHeight = navElement.getBoundingClientRect().height
		if (navHeight <= 0) return

		document.documentElement.style.setProperty(
			'--measured-global-nav-height',
			`${navHeight}px`
		)
	}

	function clearMeasuredNavHeightSync() {
		if (measureNavHeightFrame === undefined || typeof window === 'undefined') {
			return
		}

		window.cancelAnimationFrame(measureNavHeightFrame)
		measureNavHeightFrame = undefined
	}

	function scheduleMeasuredNavHeightSync() {
		if (typeof window === 'undefined' || measureNavHeightFrame !== undefined) {
			return
		}

		measureNavHeightFrame = window.requestAnimationFrame(() => {
			measureNavHeightFrame = undefined
			syncMeasuredNavHeight()
		})
	}

	$effect(() => {
		if (!navElement) return

		showQuizTray
		showPrimaryActions

		scheduleMeasuredNavHeightSync()
	})

	onMount(() => {
		if (!navElement) return

		syncMeasuredNavHeight()

		const resizeObserver = new ResizeObserver(() => {
			scheduleMeasuredNavHeightSync()
		})

		resizeObserver.observe(navElement)

		return () => {
			clearMeasuredNavHeightSync()
			resizeObserver.disconnect()
			document.documentElement.style.removeProperty(
				'--measured-global-nav-height'
			)
		}
	})
</script>

{#snippet copyButtonContent()}
	<span class="sr-only">{button_copy_link({}, { locale })}</span>
	<LinkComponent />
{/snippet}

<nav
	bind:this={navElement}
	in:fly={{
		y: 18,
		opacity: 0,
		duration: enterTransitionDuration,
		easing: cubicOut
	}}
	out:fly={{
		y: 18,
		opacity: 0,
		duration: exitTransitionDuration,
		easing: cubicIn
	}}
	data-sticky-global-nav
	class="pointer-events-none fixed inset-x-0 bottom-0 z-50 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
	style:view-transition-name={transitionName}
	data-testid="global-nav"
>
	<div class="container mx-auto w-full max-w-xs px-2 md:max-w-sm md:px-4">
		<div
			class="panel-surface pointer-events-auto w-full rounded-lg px-2 py-2 shadow-[0_-10px_22px_-16px_rgba(15,23,42,0.32),0_10px_22px_-16px_rgba(15,23,42,0.24)] ring-1 ring-stone-300/70 md:px-3 md:py-3 dark:shadow-[0_-12px_24px_-16px_rgba(0,0,0,0.55),0_12px_24px_-16px_rgba(0,0,0,0.45)] dark:ring-stone-700/80"
		>
			{#if showQuizTray}
				<div
					in:slide={{
						duration: AppSettings.transitionDuration.duration,
						easing: sineInOut
					}}
					out:slide={{
						duration: AppSettings.transitionDuration.duration,
						easing: sineInOut
					}}
					class="mb-2 md:mb-3"
				>
					{#if renderControls}
						<NumpadComponent
							value={renderControls.value}
							disabled={renderControls.disabled}
							disabledNext={renderControls.disabledNext}
							nextButtonColor={renderControls.nextButtonColor}
							onValueChange={renderControls.onValueChange}
							onCompletePuzzle={renderControls.onCompletePuzzle}
						/>
					{/if}
				</div>
			{/if}

			{#if showPrimaryActions}
				<div
					class="mb-2 flex items-stretch gap-2 md:mb-3 md:gap-2.5"
					in:slide={{
						duration: AppSettings.transitionDuration.duration,
						easing: sineInOut
					}}
					out:slide={{
						duration: AppSettings.transitionDuration.duration,
						easing: sineInOut
					}}
				>
					<div class="flex-1">
						<SplitButtonComponent
							onclick={onStart}
							onSecondaryClick={() => onReplay?.()}
							secondaryLabel={replayLabel}
							secondaryEnabled={!!onReplay}
							color="green"
							fullWidth={true}
							testId="btn-start"
						>
							{startLabel}
						</SplitButtonComponent>
					</div>
					<div class="shrink-0">
						<SplitButtonComponent
							onclick={() => onCopyLink()}
							onSecondaryClick={() => onCopyDeterministicLink?.()}
							secondaryLabel={label_copy_link_same_puzzles()}
							secondaryEnabled={hasDeterministicCopyAction}
							variant="outline"
							color="gray"
							size="medium"
							testId="btn-copy-link"
						>
							{@render copyButtonContent()}
						</SplitButtonComponent>
					</div>
				</div>
			{/if}

			<div class="grid grid-cols-3 gap-2 md:gap-2.5">
				<button
					type="button"
					data-testid="btn-menu"
					title={button_menu({}, { locale })}
					aria-current={pathname === '/' ? 'page' : undefined}
					onclick={onNavigateMenu}
					class={navButtonClassForPath('/')}
				>
					<span class="sr-only">{button_menu({}, { locale })}</span>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 -960 960 960"
						fill="currentColor"
						class="mx-auto h-6 w-6"
						aria-hidden="true"
					>
						<path
							d="M240-200h120v-240h240v240h120v-360L480-740 240-560v360Zm-80 80v-480l320-240 320 240v480H520v-240h-80v240H160Zm320-350Z"
						/>
					</svg>
				</button>
				<button
					type="button"
					title={heading_results({}, { locale })}
					data-testid="btn-results"
					aria-current={pathname === '/results' ? 'page' : undefined}
					onclick={onNavigateResults}
					class={navButtonClassForPath('/results')}
				>
					<span class="sr-only">{heading_results({}, { locale })}</span>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="currentColor"
						class="mx-auto h-6 w-6"
						aria-hidden="true"
					>
						<rect x="4" y="12" width="4" height="8" rx="1" />
						<rect x="10" y="8" width="4" height="12" rx="1" />
						<rect x="16" y="4" width="4" height="16" rx="1" />
					</svg>
				</button>
				<button
					type="button"
					title={heading_settings({}, { locale })}
					data-testid="btn-global-settings"
					aria-current={pathname === '/settings' ? 'page' : undefined}
					onclick={onNavigateSettings}
					class={navButtonClassForPath('/settings')}
				>
					<span class="sr-only">{heading_settings({}, { locale })}</span>
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
						aria-hidden="true"
						class="mx-auto"
					>
						<line x1="4" y1="6" x2="20" y2="6" />
						<line x1="4" y1="12" x2="20" y2="12" />
						<line x1="4" y1="18" x2="20" y2="18" />
						<circle cx="8" cy="6" r="2" fill="currentColor" />
						<circle cx="16" cy="12" r="2" fill="currentColor" />
						<circle cx="10" cy="18" r="2" fill="currentColor" />
					</svg>
				</button>
			</div>
		</div>
	</div>
</nav>
