<script lang="ts">
	import '../app.css'
	import { onMount, tick } from 'svelte'
	import { SvelteMap } from 'svelte/reactivity'
	import {
		afterNavigate,
		beforeNavigate,
		goto,
		onNavigate
	} from '$app/navigation'
	import type { LayoutData } from './$types'
	import type { Snippet } from 'svelte'
	import {
		toast_copy_link_deterministic_success,
		toast_copy_link_error,
		toast_copy_link_validation_error,
		toast_copy_link_success,
		app_description,
		app_title,
		app_title_full,
		error_boundary_message,
		error_boundary_reload,
		error_boundary_title,
		heading_puzzles,
		heading_results,
		heading_settings
	} from '#lib/paraglide/messages.js'
	import type { Locale } from '#lib/paraglide/runtime.js'
	import { AppSettings } from '#lib/constants/AppSettings.ts'
	import {
		theme,
		applyTheme,
		enableOnboardingPanelForDev,
		toggleDevToolsVisibility,
		activeToast,
		dismissToast,
		showToast,
		routeNavigationInFlight,
		quizEntryRoute
	} from '#lib/stores.ts'
	import { switchLocale as doSwitchLocale } from '#lib/helpers/localeHelper.ts'
	import { safeMsg } from '#lib/helpers/safeMsgHelper.ts'
	import { handleLayoutBeforeNavigate } from '#lib/helpers/layout/layoutBeforeNavigateHelper.ts'
	import { shouldShowDeterministicCopyLinkAction } from '#lib/helpers/layout/layoutCopyLinkHelper.ts'
	import {
		normalizeLayoutPageTitleKey,
		getLayoutPageTitle,
		getStickyGlobalNavTransitionName
	} from '#lib/helpers/layout/layoutPageTitleHelper.ts'
	import { executeLayoutOnNavigateTransition } from '#lib/helpers/layout/layoutViewTransitionHelper.ts'
	import { scheduleRouteNavigationGateRelease } from '#lib/helpers/layout/layoutRouteTransitionGateHelper.ts'
	import {
		setupSystemThemeSync,
		setupLayoutMountDocument,
		handleDevToolsShortcut,
		handleOnboardingShortcut
	} from '#lib/helpers/layout/layoutSetupHelper.ts'
	import {
		copyTextWithFeedback,
		registerStickyQuizControls,
		registerStickyStartActions,
		resolveStickyStartAction
	} from '#lib/helpers/layout/layoutActionsHelper.ts'
	import { cancelPendingQuizUrlSync } from '#lib/helpers/urlParamsHelper.ts'
	import { type Component } from 'svelte'
	type LayoutUpdateNotificationHandle = { showNotification: () => void }
	type LayoutUpdateNotificationComponent = Component<
		{ locale?: Locale | undefined },
		LayoutUpdateNotificationHandle
	>
	import { createLayoutNavigationActions } from '#lib/helpers/layout/layoutWiringHelper.ts'
	import { ensureLazyComponentLoaded } from '#lib/helpers/lazyComponentHelper.ts'
	import {
		createQuizLeaveNavigationGuard,
		type QuizLeaveNavigationPath,
		type QuizLeaveNavigationState
	} from '#lib/helpers/quiz/quizLeaveNavigationHelper.ts'
	import {
		setStickyGlobalNavContext,
		type StickyGlobalNavQuizControls,
		type StickyGlobalNavStartActions
	} from '#lib/contexts/stickyGlobalNavContext.ts'
	import { setQuizLeaveNavigationContext } from '#lib/contexts/quizLeaveNavigationContext.ts'
	import { setSettingsRouteContext } from '#lib/contexts/settingsRouteContext.ts'
	import type { DialogHandle } from '#lib/models/DialogHandle.ts'
	import AppShell from '#lib/components/layout/AppShell.svelte'
	import GlobalNav from '#lib/components/layout/GlobalNav.svelte'
	import QuizLeaveDialogComponent from '#lib/components/dialogs/QuizLeaveDialogComponent.svelte'
	import ToastComponent from '#lib/components/widgets/ToastComponent.svelte'

	// Props
	let { children, data }: { children: Snippet; data: LayoutData } = $props()

	// State and derived values
	let localeOverride = $state<Locale | undefined>(undefined)
	let locale = $derived(localeOverride ?? data.locale)
	let UpdateNotificationLoadedComponent =
		$state<LayoutUpdateNotificationComponent | null>(null)
	let updateNotification = $state<LayoutUpdateNotificationHandle | undefined>(
		undefined
	)
	let quizLeaveDialog = $state<DialogHandle | undefined>(undefined)
	let stickyGlobalNavStartActions = $state<
		StickyGlobalNavStartActions | undefined
	>(undefined)
	let stickyGlobalNavQuizControls = $state<
		StickyGlobalNavQuizControls | undefined
	>(undefined)
	let stickyGlobalNavQuizControlsToken = 0
	let stickyGlobalNavStartActionsToken = 0
	let routeNavigationToken = 0
	const quizLeaveNavigationState = $state<QuizLeaveNavigationState>({
		currentPath: '',
		pendingQuizNavigation: undefined,
		allowNextQuizNavigation: false
	})
	const deterministicSeedByQueryKey = new SvelteMap<string, number>()
	let shallowNavigationSearch = $state<string | undefined>(undefined)
	let shallowNavigationFocusTarget = $state<HTMLElement | undefined>(undefined)
	let isQuizRoute = $derived(data.pathname === '/quiz')
	let pageTitle = $derived.by(() => {
		locale

		return getLayoutPageTitle(normalizeLayoutPageTitleKey(data.pageTitleKey), {
			appTitleFull: safeMsg(() => app_title_full({}, { locale }), 'Regneflyt'),
			appTitle: safeMsg(() => app_title({}, { locale }), 'Regneflyt'),
			quizTitle: safeMsg(() => heading_puzzles({}, { locale }), 'Quiz'),
			resultsTitle: safeMsg(() => heading_results({}, { locale }), 'Results'),
			settingsTitle: safeMsg(() => heading_settings({}, { locale }), 'Settings')
		})
	})

	// Helper wiring
	async function ensureUpdateNotification(): Promise<void> {
		await ensureLazyComponentLoaded(
			UpdateNotificationLoadedComponent,
			() => import('#lib/components/widgets/UpdateNotification.svelte'),
			(component) => {
				UpdateNotificationLoadedComponent = component
			},
			tick
		)
	}

	const navigationActions = createLayoutNavigationActions({
		getLocation: () => window.location,
		getStartActions: () => stickyGlobalNavStartActions,
		navigation: {
			navigate: (destination) => {
				void goto(destination)
			}
		},
		seedCache: deterministicSeedByQueryKey,
		clipboard: {
			showToast,
			copyTextWithFeedback,
			getWriteText: () =>
				navigator.clipboard?.writeText?.bind(navigator.clipboard)
		},
		getMessages: () => ({
			validationError: toast_copy_link_validation_error(),
			copyError: toast_copy_link_error(),
			deterministicSuccess: toast_copy_link_deterministic_success(),
			standardSuccess: toast_copy_link_success()
		})
	})

	// Event handlers and navigation actions
	function openQuizLeaveDialog() {
		quizLeaveDialog?.open()
	}

	const quizLeaveNavigationGuard = createQuizLeaveNavigationGuard({
		state: quizLeaveNavigationState,
		navigate: (destination) => {
			void goto(destination)
		},
		openQuitDialog: openQuizLeaveDialog,
		getCurrentLocation: navigationActions.getCurrentLocation
	})

	function registerStickyGlobalNavStartActions(
		actions: StickyGlobalNavStartActions
	): () => void {
		return registerStickyStartActions(actions, {
			getCurrentToken: () => stickyGlobalNavStartActionsToken,
			setToken: (token) => {
				stickyGlobalNavStartActionsToken = token
			},
			setActions: (value) => {
				stickyGlobalNavStartActions = value
			}
		})
	}

	function registerStickyGlobalNavQuizControls(
		controls: StickyGlobalNavQuizControls
	): () => void {
		return registerStickyQuizControls(controls, {
			getCurrentToken: () => stickyGlobalNavQuizControlsToken,
			setToken: (token) => {
				stickyGlobalNavQuizControlsToken = token
			},
			setControls: (value) => {
				stickyGlobalNavQuizControls = value
			}
		})
	}

	let stickyGlobalNavStartAction = $derived(
		resolveStickyStartAction(
			stickyGlobalNavStartActions,
			navigationActions.startQuizFromCurrentQuery
		)
	)
	let suppressStickyGlobalNavTransitionName = $state(false)
	let navMode = $derived<'default' | 'quiz'>(isQuizRoute ? 'quiz' : 'default')
	let stickyGlobalNavTransitionName = $derived.by(() => {
		return getStickyGlobalNavTransitionName(
			data.pathname,
			suppressStickyGlobalNavTransitionName
		)
	})
	let showDeterministicCopyLinkAction = $derived.by(() => {
		return shouldShowDeterministicCopyLinkAction(
			shallowNavigationSearch ?? data.search
		)
	})
	let pageDescription = $derived(app_description({}, { locale }))
	let appShellContentLayout = $derived<'default' | 'bottom'>(
		isQuizRoute ? 'bottom' : 'default'
	)
	let appShellBottomNavSize = $derived<'compact' | 'expanded'>(
		isQuizRoute ? 'expanded' : 'compact'
	)
	let politeToastMessage = $derived.by(() => {
		const toast = activeToast.current
		if (toast === undefined) return ''

		// Excludes rather than includes variants, so a new one is announced here by
		// default instead of falling silent between this region and ToastComponent.
		return toast.variant === 'error' ? '' : toast.message
	})
	let currentToast = $derived(activeToast.current)

	function requestHeaderNavigation(destination: QuizLeaveNavigationPath) {
		cancelPendingQuizUrlSync()
		quizLeaveNavigationGuard.requestHeaderNavigation(destination)
	}

	function navigateToMenu() {
		requestHeaderNavigation('/')
	}

	function navigateToResults() {
		requestHeaderNavigation('/results')
	}

	function navigateToSettings() {
		requestHeaderNavigation('/settings')
	}

	function onCopyDeterministicLink() {
		if (!showDeterministicCopyLinkAction) return
		void navigationActions.copySetupLinkToClipboard(true)
	}

	setQuizLeaveNavigationContext({
		requestQuizLeaveNavigation:
			quizLeaveNavigationGuard.requestQuizLeaveNavigation,
		navigateWithQuizLeaveBypass:
			quizLeaveNavigationGuard.navigateWithQuizLeaveBypass
	})

	setSettingsRouteContext({
		switchLocale: (nextLocale) => {
			const newLocale = doSwitchLocale(nextLocale)
			if (!newLocale) return undefined
			localeOverride = newLocale
			return newLocale
		},
		simulateUpdateNotification: () => {
			void ensureUpdateNotification().then(() => {
				updateNotification?.showNotification()
			})
		}
	})

	setStickyGlobalNavContext({
		registerStartActions: registerStickyGlobalNavStartActions,
		registerQuizControls: registerStickyGlobalNavQuizControls
	})

	$effect(() => {
		locale

		if (typeof document !== 'undefined') {
			document.documentElement.lang = locale
		}
	})

	$effect(() => {
		quizLeaveNavigationState.currentPath = data.pathname
	})

	// Lifecycle and router hooks
	onMount(() => {
		setupLayoutMountDocument(
			document,
			requestAnimationFrame,
			AppSettings.transitionDuration.duration,
			AppSettings.pageTransitionDuration.duration
		)
		applyTheme(theme.current)
		void ensureUpdateNotification()

		const cleanupSystemThemeSync = setupSystemThemeSync(
			window,
			() => theme.current,
			applyTheme
		)

		return () => {
			cleanupSystemThemeSync()
		}
	})

	beforeNavigate((navigation) => {
		if (navigation.shallow) return

		handleLayoutBeforeNavigate(
			navigation.to,
			() => navigation.cancel(),
			quizLeaveNavigationGuard.handleBeforeNavigate
		)
	})

	onNavigate((navigation) => {
		if (navigation.shallow) {
			const activeElement = document.activeElement
			shallowNavigationFocusTarget =
				activeElement instanceof HTMLElement ? activeElement : undefined
			return
		}

		const navigationToken = ++routeNavigationToken
		const fromPath = quizLeaveNavigationState.currentPath
		const toPath = navigation.to?.url.pathname

		quizLeaveNavigationGuard.syncOnNavigate(toPath)

		// Remember the route the quiz was entered from so cancelling it can
		// return there. Navigating within the quiz route itself leaves the
		// previously recorded entry route untouched; leaving the quiz route
		// clears it.
		if (toPath !== '/quiz') {
			quizEntryRoute.current = undefined
		} else if (fromPath !== '/quiz') {
			quizEntryRoute.current = fromPath
		}

		// Marks the window during which components mounted by this navigation
		// should suppress their entrance transitions, so route changes never
		// replay a panel's reveal animation purely because it remounted.
		routeNavigationInFlight.current = true
		scheduleRouteNavigationGateRelease(
			navigation.complete,
			requestAnimationFrame,
			() => {
				routeNavigationInFlight.current = false
			},
			() => routeNavigationToken === navigationToken
		)

		return executeLayoutOnNavigateTransition({
			fromPath,
			toPath,
			documentTarget: document,
			navigationComplete: navigation.complete,
			awaitTick: tick,
			onSetStickyTransitionSuppressed: (suppressed) => {
				suppressStickyGlobalNavTransitionName = suppressed
			}
		})
	})

	afterNavigate((navigation) => {
		if (navigation.shallow) {
			shallowNavigationSearch = navigation.to?.url.search
			if (shallowNavigationFocusTarget?.isConnected) {
				shallowNavigationFocusTarget.focus({ preventScroll: true })
			}
			shallowNavigationFocusTarget = undefined
			return
		}
		shallowNavigationSearch = undefined

		// Routes have no <h1> of their own, so focus moves to <main> instead.
		// Skipped on the initial load, which must not steal focus.
		if (navigation.type === 'enter') return

		// preventScroll keeps SvelteKit's scroll restoration intact on back/forward.
		document.getElementById('main-content')?.focus({ preventScroll: true })
	})

	function handleError(error: unknown) {
		console.error('Uncaught render error:', error)
	}

	function onDevToolsShortcut(event: KeyboardEvent) {
		if (handleDevToolsShortcut(event, toggleDevToolsVisibility)) {
			return
		}

		handleOnboardingShortcut(
			event,
			AppSettings.isProduction,
			enableOnboardingPanelForDev
		)
	}
</script>

{#snippet stickyGlobalNavSnippet()}
	<GlobalNav
		{locale}
		pathname={data.pathname}
		mode={navMode}
		quizControls={stickyGlobalNavQuizControls}
		transitionName={stickyGlobalNavTransitionName}
		onStart={stickyGlobalNavStartAction}
		onNavigateMenu={navigateToMenu}
		onNavigateResults={navigateToResults}
		onNavigateSettings={navigateToSettings}
		onCopyLink={() => navigationActions.copySetupLinkToClipboard(false)}
		onCopyDeterministicLink={showDeterministicCopyLinkAction
			? onCopyDeterministicLink
			: undefined}
	/>
{/snippet}

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:url" content={data.canonicalUrl} />
</svelte:head>

<svelte:window onkeydown={onDevToolsShortcut} />

<svelte:boundary onerror={handleError}>
	<AppShell
		{locale}
		contentLayout={appShellContentLayout}
		onRequestHeaderNavigation={quizLeaveNavigationGuard.requestHeaderNavigation}
		bottomNavSnippet={stickyGlobalNavSnippet}
		bottomNavSize={appShellBottomNavSize}
	>
		{@render children()}
	</AppShell>
	<QuizLeaveDialogComponent
		bind:this={quizLeaveDialog}
		{locale}
		onConfirm={quizLeaveNavigationGuard.confirmPendingQuizLeaveNavigation}
	/>
	{#if UpdateNotificationLoadedComponent}
		<UpdateNotificationLoadedComponent
			{locale}
			bind:this={updateNotification}
		/>
	{/if}
	<!-- Mounted unconditionally and text-only: a live region inserted together with
	     its content is not announced, and wrapping the toast would put the dismiss
	     button's label in the announcement. Error toasts carry role="alert"
	     themselves, so they must stay outside this region to avoid nesting. -->
	<div role="status" class="sr-only" data-testid="toast-live-region">
		{politeToastMessage}
	</div>
	{#if currentToast}
		{#key currentToast.id}
			{@const toast = currentToast}
			<ToastComponent
				testId={toast.testId}
				message={toast.message}
				variant={toast.variant}
				bottomNavSize={appShellBottomNavSize}
				autoDismissMs={toast.autoDismissMs}
				onDismiss={() => dismissToast(toast.id)}
			/>
		{/key}
	{/if}
	{#snippet failed()}
		<div class="flex min-h-screen items-center justify-center p-6">
			<div class="panel-surface max-w-sm rounded-lg p-8 text-center">
				<h1 class="mb-2 text-2xl font-bold text-stone-900 dark:text-stone-100">
					{safeMsg(
						() => error_boundary_title({}, { locale }),
						'Something went wrong'
					)}
				</h1>
				<p class="mb-6 text-stone-700 dark:text-stone-200">
					{safeMsg(
						() => error_boundary_message({}, { locale }),
						'An unexpected error occurred. Try reloading the page.'
					)}
				</p>
				<button
					type="button"
					class="btn-blue rounded-md px-6 py-2 font-semibold"
					onclick={() => location.reload()}
				>
					{safeMsg(() => error_boundary_reload({}, { locale }), 'Reload')}
				</button>
			</div>
		</div>
	{/snippet}
</svelte:boundary>
