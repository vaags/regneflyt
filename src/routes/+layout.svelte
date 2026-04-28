<script lang="ts">
	import '../app.css'
	import { onMount, tick } from 'svelte'
	import { SvelteMap } from 'svelte/reactivity'
	import { beforeNavigate, goto, onNavigate } from '$app/navigation'
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
		cancel_confirm,
		error_boundary_message,
		error_boundary_reload,
		error_boundary_title,
		heading_puzzles,
		heading_results,
		heading_settings,
		quit_confirm_message
	} from '$lib/paraglide/messages.js'
	import { type Locale } from '$lib/paraglide/runtime.js'
	import { AppSettings } from '$lib/constants/AppSettings'
	import {
		theme,
		applyTheme,
		enableOnboardingPanelForDev,
		toggleDevToolsVisibility,
		activeToast,
		dismissToast,
		showToast,
		lastResults
	} from '$lib/stores'
	import { switchLocale as doSwitchLocale } from '$lib/helpers/localeHelper'
	import { safeMsg } from '$lib/helpers/safeMsgHelper'
	import {
		handleLayoutBeforeNavigate,
		normalizeLayoutPageTitleKey,
		getLayoutPageTitle,
		getStickyGlobalNavTransitionName,
		shouldShowDeterministicCopyLinkAction,
		executeLayoutOnNavigateTransition
	} from '$lib/helpers/layout/layoutNavigationHelper'
	import {
		setupLayoutMountSync,
		setupLayoutMountDocument,
		handleDevToolsShortcut,
		handleOnboardingShortcut
	} from '$lib/helpers/layout/layoutSetupHelper'
	import {
		copyTextWithFeedback,
		resolveStickyReplayAction,
		resolveStickyStartAction
	} from '$lib/helpers/layout/layoutActionsHelper'
	import {
		createLayoutComponentLoaders,
		type LayoutUpdateNotificationComponent,
		type LayoutUpdateNotificationHandle
	} from '$lib/helpers/layout/layoutComponentOrchestrator'
	import {
		createStickyStartActionsRegistrar,
		registerLayoutContexts
	} from '$lib/helpers/layout/layoutContextOrchestrator'
	import { createLayoutNavigationActions } from '$lib/helpers/layout/layoutNavigationOrchestrator'
	import {
		createQuizLeaveNavigationGuard,
		type QuizLeaveNavigationState
	} from '$lib/helpers/quiz/quizLeaveNavigationHelper'
	import { quizQueryUpdatedEventName } from '$lib/helpers/urlParamsHelper'
	import {
		type StickyGlobalNavQuizControls,
		type StickyGlobalNavStartActions
	} from '$lib/contexts/stickyGlobalNavContext'
	import AppShell from '$lib/components/layout/AppShell.svelte'
	import GlobalNav from '$lib/components/layout/GlobalNav.svelte'
	import DialogComponent from '$lib/components/widgets/DialogComponent.svelte'
	import ToastComponent from '$lib/components/widgets/ToastComponent.svelte'

	let { children, data }: { children: Snippet; data: LayoutData } = $props()

	let localeOverride = $state<Locale | undefined>(undefined)
	let locale = $derived(localeOverride ?? data.locale)
	let UpdateNotificationLoadedComponent =
		$state<LayoutUpdateNotificationComponent | null>(null)
	let updateNotification = $state<LayoutUpdateNotificationHandle | undefined>(
		undefined
	)
	let quizLeaveDialog = $state<DialogComponent | undefined>(undefined)
	let stickyGlobalNavStartActions = $state<
		StickyGlobalNavStartActions | undefined
	>(undefined)
	let stickyGlobalNavQuizControls = $state<
		StickyGlobalNavQuizControls | undefined
	>(undefined)
	let stickyGlobalNavStartActionsToken = 0
	const quizLeaveNavigationState = $state<QuizLeaveNavigationState>({
		currentPath: '',
		pendingQuizNavigation: undefined,
		allowNextQuizNavigation: false
	})
	const deterministicSeedByQueryKey = new SvelteMap<string, number>()
	let currentSearch = $state<string | null>(null)
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

	const componentLoaders = createLayoutComponentLoaders({
		getUpdateNotificationComponent: () => UpdateNotificationLoadedComponent,
		setUpdateNotificationComponent: (component) => {
			UpdateNotificationLoadedComponent = component
		},
		getUpdateNotification: () => updateNotification,
		awaitLoaded: tick
	})

	const navigationActions = createLayoutNavigationActions({
		getLocation: () => window.location,
		getStartActions: () => stickyGlobalNavStartActions,
		getLastResults: () => lastResults.current,
		navigate: (destination) => {
			void goto(destination)
		},
		seedCache: deterministicSeedByQueryKey,
		showToast,
		copyTextWithFeedback,
		getWriteText: () =>
			navigator.clipboard?.writeText?.bind(navigator.clipboard),
		getMessages: () => ({
			validationError: toast_copy_link_validation_error(),
			copyError: toast_copy_link_error(),
			deterministicSuccess: toast_copy_link_deterministic_success(),
			standardSuccess: toast_copy_link_success()
		})
	})

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

	const registerStickyGlobalNavStartActions = createStickyStartActionsRegistrar(
		{
			getCurrentToken: () => stickyGlobalNavStartActionsToken,
			setToken: (token) => {
				stickyGlobalNavStartActionsToken = token
			},
			setActions: (value) => {
				stickyGlobalNavStartActions = value
			},
			resetToken: () => {
				stickyGlobalNavStartActionsToken = 0
			}
		}
	)

	function setStickyGlobalNavQuizControls(
		controls: StickyGlobalNavQuizControls | undefined
	) {
		stickyGlobalNavQuizControls = controls
	}

	let stickyGlobalNavStartAction = $derived(
		resolveStickyStartAction(
			stickyGlobalNavStartActions,
			navigationActions.startQuizFromCurrentQuery
		)
	)
	let stickyGlobalNavReplayAction = $derived(
		resolveStickyReplayAction(
			stickyGlobalNavStartActions,
			Boolean(lastResults.current?.puzzleSet?.length),
			navigationActions.replayLastQuizFromHistory
		)
	)
	let suppressStickyGlobalNavTransitionName = $state(false)
	let deferringNavMode = $state(false)
	let navMode = $state<'default' | 'quiz'>('default')
	let stickyGlobalNavTransitionName = $derived.by(() => {
		return getStickyGlobalNavTransitionName(
			data.pathname,
			suppressStickyGlobalNavTransitionName
		)
	})
	let showDeterministicCopyLinkAction = $derived.by(() => {
		return shouldShowDeterministicCopyLinkAction(currentSearch ?? data.search)
	})
	let pageDescription = $derived(app_description({}, { locale }))

	$effect(() => {
		const target = isQuizRoute ? 'quiz' : 'default'
		if (!deferringNavMode) {
			navMode = target
		}
	})

	registerLayoutContexts({
		quizLeaveNavigationGuard,
		registerStartActions: registerStickyGlobalNavStartActions,
		setQuizControls: setStickyGlobalNavQuizControls,
		switchLocale: doSwitchLocale,
		setLocaleOverride: (nextLocale) => {
			localeOverride = nextLocale
		},
		ensureUpdateNotification: componentLoaders.ensureUpdateNotification,
		getUpdateNotification: () => updateNotification
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

	onMount(() => {
		setupLayoutMountDocument(
			document,
			requestAnimationFrame,
			AppSettings.transitionDuration.duration,
			AppSettings.pageTransitionDuration.duration
		)
		applyTheme(theme.current)
		void componentLoaders.ensureUpdateNotification()

		const cleanupMountSync = setupLayoutMountSync(
			window,
			quizQueryUpdatedEventName,
			() => theme.current,
			(search) => {
				currentSearch = search
			},
			applyTheme
		)

		return () => {
			cleanupMountSync()
		}
	})

	beforeNavigate((navigation) => {
		handleLayoutBeforeNavigate(
			navigation.to,
			() => navigation.cancel(),
			quizLeaveNavigationGuard.handleBeforeNavigate
		)
	})

	onNavigate((navigation) => {
		const fromPath = quizLeaveNavigationState.currentPath
		const toPath = navigation.to?.url.pathname

		quizLeaveNavigationGuard.syncOnNavigate(toPath)

		return executeLayoutOnNavigateTransition({
			fromPath,
			toPath,
			documentTarget: document,
			navigationComplete: navigation.complete,
			awaitTick: tick,
			onSetStickyTransitionSuppressed: (suppressed) => {
				suppressStickyGlobalNavTransitionName = suppressed
			},
			onSetDeferringNavMode: (defer) => {
				deferringNavMode = defer
			},
			onResetNavModeToDefault: () => {
				navMode = 'default'
			}
		})
	})

	function handleError(error: unknown) {
		console.error('Uncaught render error:', error)
	}

	function onDevToolsShortcut(event: KeyboardEvent) {
		if (
			handleDevToolsShortcut(
				event,
				AppSettings.isProduction,
				toggleDevToolsVisibility
			)
		) {
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
		retainQuizControls={deferringNavMode}
		transitionName={stickyGlobalNavTransitionName}
		onStart={stickyGlobalNavStartAction}
		onReplay={stickyGlobalNavReplayAction}
		onNavigateMenu={() => quizLeaveNavigationGuard.requestHeaderNavigation('/')}
		onNavigateResults={() =>
			quizLeaveNavigationGuard.requestHeaderNavigation('/results')}
		onNavigateSettings={() =>
			quizLeaveNavigationGuard.requestHeaderNavigation('/settings')}
		onCopyLink={() => navigationActions.copySetupLinkToClipboard(false)}
		onCopyDeterministicLink={showDeterministicCopyLinkAction
			? () => navigationActions.copySetupLinkToClipboard(true)
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
		contentLayout={isQuizRoute ? 'bottom' : 'default'}
		onRequestHeaderNavigation={quizLeaveNavigationGuard.requestHeaderNavigation}
		bottomNavSnippet={stickyGlobalNavSnippet}
		bottomNavSize={isQuizRoute ? 'expanded' : 'compact'}
	>
		{@render children()}
	</AppShell>
	<DialogComponent
		bind:this={quizLeaveDialog}
		{locale}
		heading={cancel_confirm({}, { locale })}
		headingTestId="quit-dialog-heading"
		confirmColor="red"
		onConfirm={quizLeaveNavigationGuard.confirmPendingQuizLeaveNavigation}
		confirmTestId="btn-cancel-yes"
		dismissTestId="btn-cancel-no"
	>
		<p
			class="mb-6 text-lg text-stone-700 dark:text-stone-300"
			data-testid="quit-confirm-message"
		>
			{quit_confirm_message({}, { locale })}
		</p>
	</DialogComponent>
	{#if UpdateNotificationLoadedComponent}
		<UpdateNotificationLoadedComponent
			{locale}
			bind:this={updateNotification}
		/>
	{/if}
	{#if activeToast.current}
		{#key activeToast.current.id}
			<ToastComponent
				testId={activeToast.current.testId}
				message={activeToast.current.message}
				variant={activeToast.current.variant}
				hasStickyGlobalNav={true}
				autoDismissMs={activeToast.current.autoDismissMs}
				onDismiss={dismissToast}
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
				<p class="mb-6 text-stone-700 dark:text-stone-300">
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
