<script lang="ts">
	import '../app.css'
	import { onMount, tick, type Component } from 'svelte'
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
		toggleDevToolsVisibility,
		activeToast,
		dismissToast,
		showToast,
		lastResults
	} from '$lib/stores'
	import { switchLocale as doSwitchLocale } from '$lib/helpers/localeHelper'
	import { handleLayoutBeforeNavigate } from '$lib/helpers/layoutBeforeNavigateHelper'
	import {
		normalizeLayoutPageTitleKey,
		getLayoutPageTitle,
		getStickyGlobalNavTransitionName,
		shouldShowDeterministicCopyLinkAction
	} from '$lib/helpers/layoutHelper'
	import { ensureLazyComponentLoaded } from '$lib/helpers/lazyComponentHelper'
	import { setupLayoutMountSync } from '$lib/helpers/layoutMountSyncHelper'
	import { setupLayoutMountDocument } from '$lib/helpers/layoutMountDocumentHelper'
	import {
		buildCanonicalCopyBaseUrl,
		canCopyLink,
		getDeterministicSeedForQuery,
		resolveCopyLinkSearchParams,
		resolveCopyLinkSuccessMessage
	} from '$lib/helpers/layoutCopyLinkHelper'
	import { copyTextWithFeedback } from '$lib/helpers/layoutClipboardHelper'
	import {
		registerStickyStartActions,
		resolveStickyReplayAction,
		resolveStickyStartAction
	} from '$lib/helpers/layoutStartActionsHelper'
	import {
		simulateUpdateNotificationAfterEnsure,
		switchLocaleWithOverride
	} from '$lib/helpers/layoutSettingsContextHelper'
	import { handleDevToolsShortcut } from '$lib/helpers/layoutShortcutHelper'
	import { getQuiz } from '$lib/helpers/quizHelper'
	import {
		buildCopyLinkUrl,
		buildQuizParams,
		buildReplayParams,
		quizQueryUpdatedEventName
	} from '$lib/helpers/urlParamsHelper'
	import {
		executeLayoutNavigationTransition,
		resolveLayoutNavigationTransition
	} from '$lib/helpers/layoutTransitionHelper'
	import {
		createQuizLeaveNavigationGuard,
		type QuizLeaveNavigationState
	} from '$lib/helpers/quizLeaveNavigationHelper'
	import { setQuizLeaveNavigationContext } from '$lib/contexts/quizLeaveNavigationContext'
	import { setSettingsRouteContext } from '$lib/contexts/settingsRouteContext'
	import {
		setStickyGlobalNavContext,
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
	let SkillDialogLoadedComponent = $state<Component<
		{ locale?: Locale | undefined },
		{ open: () => void }
	> | null>(null)
	let UpdateNotificationLoadedComponent = $state<Component<
		{ locale?: Locale | undefined },
		{ showNotification: () => void }
	> | null>(null)
	let skillDialog = $state<{ open: () => void } | undefined>(undefined)
	let updateNotification = $state<{ showNotification: () => void } | undefined>(
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
	let quizLeaveNavigationState = $state<QuizLeaveNavigationState>({
		currentPath: '',
		pendingQuizNavigation: undefined,
		allowNextQuizNavigation: false
	})
	const deterministicSeedByQueryKey = new SvelteMap<string, number>()
	let currentSearch = $state('')
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

	async function ensureSkillDialog() {
		await ensureLazyComponentLoaded(
			SkillDialogLoadedComponent,
			() => import('$lib/components/dialogs/SkillDialogComponent.svelte'),
			(component) => {
				SkillDialogLoadedComponent = component
			},
			tick
		)
	}

	async function ensureUpdateNotification() {
		await ensureLazyComponentLoaded(
			UpdateNotificationLoadedComponent,
			() => import('$lib/components/widgets/UpdateNotification.svelte'),
			(component) => {
				UpdateNotificationLoadedComponent = component
			},
			tick
		)
	}

	async function openSkillDialog() {
		await ensureSkillDialog()
		skillDialog?.open()
	}

	function getCurrentLocation() {
		return {
			pathname: window.location.pathname,
			search: window.location.search
		}
	}

	function openQuizLeaveDialog() {
		quizLeaveDialog?.open()
	}

	const quizLeaveNavigationGuard = createQuizLeaveNavigationGuard({
		state: quizLeaveNavigationState,
		navigate: goto,
		openQuitDialog: openQuizLeaveDialog,
		getCurrentLocation
	})

	function requestHeaderNavigation(path: '/' | '/results' | '/settings') {
		quizLeaveNavigationGuard.requestHeaderNavigation(path)
	}

	function registerStickyGlobalNavStartActions(
		actions: StickyGlobalNavStartActions
	) {
		return registerStickyStartActions(actions, {
			getCurrentToken: () => {
				return stickyGlobalNavStartActionsToken
			},
			setToken: (token) => {
				stickyGlobalNavStartActionsToken = token
			},
			setActions: (value) => {
				stickyGlobalNavStartActions = value
			},
			resetToken: () => {
				stickyGlobalNavStartActionsToken = 0
			}
		})
	}

	async function copySetupLinkToClipboard(deterministic = false) {
		if (!canCopyLink(stickyGlobalNavStartActions)) {
			showToast(toast_copy_link_validation_error(), { variant: 'error' })
			return
		}

		const searchParams = resolveCopyLinkSearchParams(
			stickyGlobalNavStartActions,
			getCurrentLocation().search
		)
		const baseUrl = buildCanonicalCopyBaseUrl(
			searchParams,
			window.location.origin
		)
		const seed = deterministic
			? getDeterministicSeedForQuery(searchParams, deterministicSeedByQueryKey)
			: undefined
		const successMessage = resolveCopyLinkSuccessMessage(deterministic, {
			deterministic: toast_copy_link_deterministic_success(),
			standard: toast_copy_link_success()
		})
		await copyTextWithFeedback(buildCopyLinkUrl(baseUrl, seed), {
			writeText: navigator.clipboard?.writeText?.bind(navigator.clipboard),
			onSuccess: () => {
				showToast(successMessage)
			},
			onError: () => {
				showToast(toast_copy_link_error(), { variant: 'error' })
			},
			logError: console.error
		})
	}

	function confirmQuizLeaveNavigation() {
		quizLeaveNavigationGuard.confirmPendingQuizLeaveNavigation()
	}

	function requestQuizLeaveNavigation(destination: string) {
		quizLeaveNavigationGuard.requestQuizLeaveNavigation(destination)
	}

	function navigateWithQuizLeaveBypass(destination: string) {
		quizLeaveNavigationGuard.navigateWithQuizLeaveBypass(destination)
	}

	function startQuizFromCurrentQuery() {
		const searchParams = new URLSearchParams(getCurrentLocation().search)
		const params = buildQuizParams(getQuiz(searchParams))
		goto(`/quiz?${params}`)
	}

	function replayLastQuizFromHistory() {
		if (!lastResults.current?.puzzleSet?.length) return
		goto(`/quiz?${buildReplayParams(lastResults.current.quiz)}`)
	}

	let stickyGlobalNavStartAction = $derived(
		resolveStickyStartAction(
			stickyGlobalNavStartActions,
			startQuizFromCurrentQuery
		)
	)
	let stickyGlobalNavReplayAction = $derived(
		resolveStickyReplayAction(
			stickyGlobalNavStartActions,
			Boolean(lastResults.current?.puzzleSet?.length),
			replayLastQuizFromHistory
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
		return shouldShowDeterministicCopyLinkAction(currentSearch)
	})

	$effect(() => {
		currentSearch = data.search
	})

	$effect(() => {
		const target = isQuizRoute ? 'quiz' : 'default'
		if (!deferringNavMode) {
			navMode = target
		}
	})

	setQuizLeaveNavigationContext({
		requestQuizLeaveNavigation,
		navigateWithQuizLeaveBypass
	})

	setSettingsRouteContext({
		switchLocale: switchLocaleFromSettingsRoute,
		simulateUpdateNotification
	})

	setStickyGlobalNavContext({
		registerStartActions: registerStickyGlobalNavStartActions,
		setQuizControls: (controls) => {
			stickyGlobalNavQuizControls = controls
		}
	})

	function switchLocaleFromSettingsRoute(nextLocale: Locale) {
		return switchLocaleWithOverride(nextLocale, doSwitchLocale, (locale) => {
			localeOverride = locale
		})
	}

	async function simulateUpdateNotification() {
		await simulateUpdateNotificationAfterEnsure(
			ensureUpdateNotification,
			() => {
				updateNotification?.showNotification()
			}
		)
	}

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
		void ensureUpdateNotification()

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

		if (!document.startViewTransition) return
		const transition = resolveLayoutNavigationTransition(fromPath, toPath)
		if (!transition.shouldRunTransition) return
		return new Promise((resolve) => {
			const startTransition = async () => {
				await executeLayoutNavigationTransition({
					documentTarget: document,
					transition,
					navigationComplete: navigation.complete,
					awaitTick: tick,
					onBeforeNavigationCompleteResolved: resolve,
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
			}

			void startTransition()
		})
	})

	function handleError(error: unknown) {
		console.error('Uncaught render error:', error)
	}

	function safeMsg(fn: () => string, fallback: string): string {
		try {
			return fn()
		} catch {
			return fallback
		}
	}

	function onDevToolsShortcut(event: KeyboardEvent) {
		handleDevToolsShortcut(
			event,
			AppSettings.isProduction,
			toggleDevToolsVisibility
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
		onNavigateMenu={() => requestHeaderNavigation('/')}
		onNavigateResults={() => requestHeaderNavigation('/results')}
		onNavigateSettings={() => requestHeaderNavigation('/settings')}
		onCopyLink={() => copySetupLinkToClipboard(false)}
		onCopyDeterministicLink={showDeterministicCopyLinkAction
			? () => copySetupLinkToClipboard(true)
			: undefined}
	/>
{/snippet}

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={app_description({}, { locale })} />
</svelte:head>

<svelte:window onkeydown={onDevToolsShortcut} />

<svelte:boundary onerror={handleError}>
	<AppShell
		{locale}
		contentLayout={isQuizRoute ? 'bottom' : 'default'}
		onOpenSkillDialog={openSkillDialog}
		onRequestHeaderNavigation={requestHeaderNavigation}
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
		onConfirm={confirmQuizLeaveNavigation}
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
	{#if SkillDialogLoadedComponent}
		<SkillDialogLoadedComponent {locale} bind:this={skillDialog} />
	{/if}
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
					class="btn-blue rounded-md px-6 py-2 font-semibold"
					onclick={() => location.reload()}
				>
					{safeMsg(() => error_boundary_reload({}, { locale }), 'Reload')}
				</button>
			</div>
		</div>
	{/snippet}
</svelte:boundary>
