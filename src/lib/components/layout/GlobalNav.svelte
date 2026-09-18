<script lang="ts">
	import { onMount } from 'svelte'
	import {
		button_start,
		button_copy_link,
		button_menu,
		heading_results,
		heading_settings,
		label_copy_link_same_puzzles
	} from '#lib/paraglide/messages.js'
	import type { Locale } from '#lib/paraglide/runtime.js'
	import type { StickyGlobalNavQuizControls } from '#lib/contexts/stickyGlobalNavContext.ts'
	import { fly } from 'svelte/transition'
	import { cubicIn, cubicOut } from 'svelte/easing'
	import { AppSettings } from '#lib/constants/AppSettings.ts'
	import {
		scheduleInitialLoadTransitionEnable,
		shouldAllowInitialTransitions
	} from '#lib/helpers/initialLoadTransitionHelper.ts'
	import LinkComponent from '#lib/components/icons/LinkComponent.svelte'
	import ButtonComponent from '#lib/components/widgets/ButtonComponent.svelte'
	import NumpadComponent from '#lib/components/widgets/NumpadComponent.svelte'
	import SplitButtonComponent from '#lib/components/widgets/SplitButtonComponent.svelte'

	// Props
	let {
		locale,
		pathname,
		mode = 'default',
		quizControls = undefined,
		transitionName = undefined,
		onStart,
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
		transitionName?: string | undefined
		onStart: () => void
		onNavigateMenu: () => void
		onNavigateResults: () => void
		onNavigateSettings: () => void
		onCopyLink: () => void | Promise<void>
		onCopyDeterministicLink?: (() => void | Promise<void>) | undefined
	} = $props()

	const enterTransitionDuration = Math.round(
		AppSettings.transitionDuration.duration * 0.9
	)
	const exitTransitionDuration = Math.round(
		AppSettings.transitionDuration.duration * 0.8
	)
	// Intentionally cold-boot-only (unlike PanelComponent's entry-transition
	// gate): GlobalNav lives in the persistent layout and is never remounted
	// by route navigation, so there is no remount-replay to guard against
	// here.
	let allowInitialTransitions = $state(shouldAllowInitialTransitions())

	let introFlyDuration = $derived(
		allowInitialTransitions ? enterTransitionDuration : 0
	)
	let outroFlyDuration = $derived(
		allowInitialTransitions ? exitTransitionDuration : 0
	)

	const renderControls = $derived(quizControls)
	const showQuizTray = $derived(mode === 'quiz' && Boolean(renderControls))
	const showPrimaryActions = $derived(mode !== 'quiz')
	let hasDeterministicCopyAction = $derived(Boolean(onCopyDeterministicLink))
	const startLabel = $derived(button_start({}, { locale }))

	// Nav height measurement state
	let navElement = $state<HTMLElement | undefined>(undefined)
	let pendingNavHeightFrame: number | undefined = undefined

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
		if (pendingNavHeightFrame === undefined || typeof window === 'undefined') {
			return
		}

		window.cancelAnimationFrame(pendingNavHeightFrame)
		pendingNavHeightFrame = undefined
	}

	function scheduleMeasuredNavHeightSync() {
		if (typeof window === 'undefined' || pendingNavHeightFrame !== undefined) {
			return
		}

		pendingNavHeightFrame = window.requestAnimationFrame(() => {
			pendingNavHeightFrame = undefined
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
		const cleanupInitialTransitionFrame = scheduleInitialLoadTransitionEnable(
			allowInitialTransitions,
			() => {
				allowInitialTransitions = true
			}
		)

		if (!navElement) {
			return () => {
				cleanupInitialTransitionFrame?.()
			}
		}

		syncMeasuredNavHeight()

		const resizeObserver = new ResizeObserver(() => {
			scheduleMeasuredNavHeightSync()
		})

		resizeObserver.observe(navElement)

		return () => {
			cleanupInitialTransitionFrame?.()
			clearMeasuredNavHeightSync()
			resizeObserver.disconnect()
			document.documentElement.style.removeProperty(
				'--measured-global-nav-height'
			)
		}
	})
</script>

{#snippet copyButtonContent()}
	<span class="visually-hidden">{button_copy_link({}, { locale })}</span>
	<LinkComponent />
{/snippet}

<nav
	bind:this={navElement}
	in:fly={{
		y: 18,
		opacity: 0,
		duration: introFlyDuration,
		easing: cubicOut
	}}
	out:fly={{
		y: 18,
		opacity: 0,
		duration: outroFlyDuration,
		easing: cubicIn
	}}
	data-sticky-global-nav
	class="global-nav"
	data-transition-name={transitionName}
	data-testid="global-nav"
>
	<div class="global-nav__container">
		<div class="global-nav__panel" data-panel-surface>
			{#if showQuizTray}
				<div class="global-nav__quiz-tray">
					{#if renderControls}
						<NumpadComponent
							value={renderControls.value}
							disabled={renderControls.disabled}
							disabledNext={renderControls.disabledNext}
							nextButtonColor={renderControls.nextButtonColor}
							ariaDescribedBy={renderControls.ariaDescribedBy}
							onValueChange={renderControls.onValueChange}
							onCompletePuzzle={renderControls.onCompletePuzzle}
						/>
					{/if}
				</div>
			{/if}

			{#if showPrimaryActions}
				<div class="global-nav__primary-actions">
					<div class="global-nav__start">
						<ButtonComponent
							onclick={onStart}
							color="green"
							fullWidth={true}
							testId="btn-start"
						>
							{startLabel}
						</ButtonComponent>
					</div>
					<div class="global-nav__copy">
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

			<div data-nav-buttons class="global-nav__buttons">
				<button
					type="button"
					data-testid="btn-menu"
					title={button_menu({}, { locale })}
					aria-current={pathname === '/' ? 'page' : undefined}
					onclick={onNavigateMenu}
					class="global-nav__button focus-indicator"
				>
					<span class="visually-hidden">{button_menu({}, { locale })}</span>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 -960 960 960"
						fill="currentColor"
						class="global-nav__icon"
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
					class="global-nav__button focus-indicator"
				>
					<span class="visually-hidden">{heading_results({}, { locale })}</span>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="currentColor"
						class="global-nav__icon"
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
					class="global-nav__button focus-indicator"
				>
					<span class="visually-hidden">{heading_settings({}, { locale })}</span
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
						aria-hidden="true"
						class="global-nav__icon"
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

<style>
	.global-nav {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		z-index: 50;
		padding-block-end: calc(env(safe-area-inset-bottom) + 0.75rem);
		pointer-events: none;
	}

	.global-nav[data-transition-name='sticky-global-nav-menu'] {
		view-transition-name: sticky-global-nav-menu;
	}

	.global-nav[data-transition-name='sticky-global-nav-results'] {
		view-transition-name: sticky-global-nav-results;
	}

	.global-nav[data-transition-name='sticky-global-nav-settings'] {
		view-transition-name: sticky-global-nav-settings;
	}

	.global-nav__container {
		inline-size: 100%;
		max-inline-size: 20rem;
		margin-inline: auto;
		padding-inline: 0.5rem;
	}

	.global-nav__panel {
		inline-size: 100%;
		padding: 0.5rem;
		border: 1px solid var(--color-surface-border);
		border-radius: var(--radius-panel);
		background: var(--color-surface);
		color: var(--color-text-primary);
		box-shadow:
			0 -10px 22px -16px rgb(15 23 42 / 0.32),
			0 10px 22px -16px rgb(15 23 42 / 0.24);
		pointer-events: auto;
	}

	.global-nav__quiz-tray,
	.global-nav__primary-actions {
		margin-block-end: 0.5rem;
	}

	.global-nav__primary-actions {
		display: flex;
		align-items: stretch;
		gap: 0.5rem;
	}

	.global-nav__start {
		min-inline-size: 0;
		flex: 1;
	}

	.global-nav__copy {
		flex: none;
	}

	.global-nav__buttons {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.5rem;
	}

	.global-nav__button {
		min-inline-size: var(--target-minimum);
		min-block-size: var(--target-minimum);
		padding: 0.5rem;
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--color-text-secondary);
		transition:
			transform 200ms ease-out,
			background-color 200ms ease-out,
			color 200ms ease-out,
			box-shadow 200ms ease-out;
	}

	.global-nav__button:hover {
		background: var(--color-surface-subtle);
	}

	.global-nav__button:active {
		transform: translateY(1px);
		box-shadow: inset 0 2px 4px rgb(0 0 0 / 0.06);
	}

	.global-nav__button[aria-current='page'] {
		border: 1px solid var(--color-primary-600);
		background: var(--color-primary-50);
		color: var(--color-primary-900);
	}

	.global-nav__icon {
		inline-size: 1.5rem;
		block-size: 1.5rem;
		margin-inline: auto;
	}

	:global(.dark) .global-nav__panel {
		box-shadow:
			0 -12px 24px -16px rgb(0 0 0 / 0.55),
			0 12px 24px -16px rgb(0 0 0 / 0.45);
	}

	:global(.dark) .global-nav__button[aria-current='page'] {
		border-color: var(--color-primary-500);
		background: color-mix(in srgb, var(--color-primary-900) 40%, transparent);
		color: var(--color-primary-50);
	}

	@media (min-width: 48rem) {
		.global-nav__container {
			max-inline-size: 24rem;
			padding-inline: 1rem;
		}

		.global-nav__panel {
			padding: 0.75rem;
		}

		.global-nav__quiz-tray,
		.global-nav__primary-actions {
			margin-block-end: 0.75rem;
		}

		.global-nav__primary-actions,
		.global-nav__buttons {
			gap: 0.625rem;
		}
	}
</style>
