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
	import { customAdaptiveDifficultyId } from '$lib/models/AdaptiveProfile'
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
	import { getQuiz } from '$lib/helpers/quizHelper'
	import {
		buildCopyLinkUrl,
		buildQuizParams,
		buildReplayParams,
		quizQueryUpdatedEventName
	} from '$lib/helpers/urlParamsHelper'
	import { parseQuizUrlQuery } from '$lib/models/quizQuerySchema'
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

		if (data.pageTitleKey === 'home' || data.pageTitleKey === 'default') {
			return safeMsg(() => app_title_full({}, { locale }), 'Regneflyt')
		}

		const appName = safeMsg(() => app_title({}, { locale }), 'Regneflyt')

		if (data.pageTitleKey === 'quiz') {
			const quizTitle = safeMsg(() => heading_puzzles({}, { locale }), 'Quiz')
			return `${quizTitle} - ${appName}`
		}

		if (data.pageTitleKey === 'results') {
			const resultsTitle = safeMsg(
				() => heading_results({}, { locale }),
				'Results'
			)
			return `${resultsTitle} - ${appName}`
		}

		const settingsTitle = safeMsg(
			() => heading_settings({}, { locale }),
			'Settings'
		)
		return `${settingsTitle} - ${appName}`
	})

	async function ensureSkillDialog() {
		if (!SkillDialogLoadedComponent) {
			SkillDialogLoadedComponent = (
				await import('$lib/components/dialogs/SkillDialogComponent.svelte')
			).default
			await tick()
		}
	}

	async function ensureUpdateNotification() {
		if (!UpdateNotificationLoadedComponent) {
			UpdateNotificationLoadedComponent = (
				await import('$lib/components/widgets/UpdateNotification.svelte')
			).default
			await tick()
		}
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
		const token = stickyGlobalNavStartActionsToken + 1
		stickyGlobalNavStartActionsToken = token
		stickyGlobalNavStartActions = actions

		return () => {
			if (stickyGlobalNavStartActionsToken === token) {
				stickyGlobalNavStartActions = undefined
				stickyGlobalNavStartActionsToken = 0
			}
		}
	}

	function getDeterministicSeedForQuery(searchParams: URLSearchParams): number {
		const parsedSeed = parseQuizUrlQuery(searchParams).seed
		if (parsedSeed !== undefined) return parsedSeed

		const canonicalQueryKey = buildQuizParams(getQuiz(searchParams)).toString()
		const existingSeed = deterministicSeedByQueryKey.get(canonicalQueryKey)
		if (existingSeed !== undefined) return existingSeed

		const generatedSeed = (Math.random() * 0x100000000) >>> 0
		deterministicSeedByQueryKey.set(canonicalQueryKey, generatedSeed)
		return generatedSeed
	}

	function buildCanonicalCopyBaseUrl(searchParams: URLSearchParams): string {
		const canonicalQuiz = getQuiz(searchParams)
		const baseUrl = new URL(window.location.origin)
		baseUrl.pathname = '/'
		baseUrl.search = buildQuizParams(canonicalQuiz).toString()
		return baseUrl.toString()
	}

	async function copySetupLinkToClipboard(deterministic = false) {
		if (
			stickyGlobalNavStartActions?.canCopyLink &&
			!stickyGlobalNavStartActions.canCopyLink()
		) {
			showToast(toast_copy_link_validation_error(), { variant: 'error' })
			return
		}

		const searchParams =
			stickyGlobalNavStartActions?.getCopyLinkSearchParams?.() ??
			new URLSearchParams(getCurrentLocation().search)
		const baseUrl = buildCanonicalCopyBaseUrl(searchParams)
		const seed = deterministic
			? getDeterministicSeedForQuery(searchParams)
			: undefined
		const successMessage = deterministic
			? toast_copy_link_deterministic_success()
			: toast_copy_link_success()

		try {
			if (!navigator.clipboard?.writeText) {
				throw new Error('Clipboard API unavailable')
			}

			await navigator.clipboard.writeText(buildCopyLinkUrl(baseUrl, seed))
			showToast(successMessage)
		} catch (err) {
			console.error('Copy link failed:', err)
			showToast(toast_copy_link_error(), { variant: 'error' })
		}
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
		stickyGlobalNavStartActions?.onStart ?? startQuizFromCurrentQuery
	)
	let stickyGlobalNavReplayAction = $derived(
		stickyGlobalNavStartActions?.onReplay ??
			(lastResults.current?.puzzleSet?.length
				? replayLastQuizFromHistory
				: undefined)
	)
	let suppressStickyGlobalNavTransitionName = $state(false)
	let deferringNavMode = $state(false)
	let navMode = $state<'default' | 'quiz'>('default')
	let stickyGlobalNavTransitionName = $derived.by(() => {
		if (suppressStickyGlobalNavTransitionName) return undefined
		if (data.pathname === '/') return 'sticky-global-nav-menu'
		if (data.pathname === '/results') return 'sticky-global-nav-results'
		if (data.pathname === '/settings') return 'sticky-global-nav-settings'
		return undefined
	})
	let showDeterministicCopyLinkAction = $derived.by(() => {
		const parsedDifficulty = parseQuizUrlQuery(
			new URLSearchParams(currentSearch)
		).difficulty
		return parsedDifficulty === customAdaptiveDifficultyId
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
		const newLocale = doSwitchLocale(nextLocale)
		if (!newLocale) return undefined
		localeOverride = newLocale
		return newLocale
	}

	async function simulateUpdateNotification() {
		await ensureUpdateNotification()
		updateNotification?.showNotification()
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
		const initialLoadClass = 'initial-load'
		const clearInitialLoadClass = () => {
			document.body.classList.remove(initialLoadClass)
		}

		requestAnimationFrame(() => {
			requestAnimationFrame(clearInitialLoadClass)
		})

		document.documentElement.style.setProperty(
			'--theme-transition-ms',
			`${AppSettings.transitionDuration.duration}ms`
		)
		document.documentElement.style.setProperty(
			'--page-transition-ms',
			`${AppSettings.pageTransitionDuration.duration}ms`
		)
		applyTheme(theme.current)
		void ensureUpdateNotification()

		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
		const onThemePreferenceChange = () => {
			if (theme.current === 'system') applyTheme('system')
		}
		const syncSearchFromLocation = () => {
			currentSearch = window.location.search
		}
		const onQuizQueryUpdated: EventListener = (event) => {
			const customEvent = event as CustomEvent<{ search?: string }>
			currentSearch = customEvent.detail?.search ?? window.location.search
		}

		syncSearchFromLocation()
		mediaQuery.addEventListener('change', onThemePreferenceChange)
		window.addEventListener('popstate', syncSearchFromLocation)
		window.addEventListener(quizQueryUpdatedEventName, onQuizQueryUpdated)

		return () => {
			mediaQuery.removeEventListener('change', onThemePreferenceChange)
			window.removeEventListener('popstate', syncSearchFromLocation)
			window.removeEventListener(quizQueryUpdatedEventName, onQuizQueryUpdated)
		}
	})

	beforeNavigate((navigation) => {
		const to = navigation.to
		if (!to) return

		quizLeaveNavigationGuard.handleBeforeNavigate({
			toUrl: to.url,
			isInternalNavigation: !!to.route?.id,
			cancelNavigation: () => navigation.cancel()
		})
	})

	onNavigate((navigation) => {
		const fromPath = quizLeaveNavigationState.currentPath
		const toPath = navigation.to?.url.pathname

		quizLeaveNavigationGuard.syncOnNavigate(toPath)

		if (!document.startViewTransition) return
		if (!toPath || fromPath === toPath) return

		const includesQuizRoute = fromPath === '/quiz' || toPath === '/quiz'
		const leavingQuiz = fromPath === '/quiz' && toPath !== '/quiz'
		const enteringQuiz = toPath === '/quiz' && fromPath !== '/quiz'
		return new Promise((resolve) => {
			const startTransition = async () => {
				if (includesQuizRoute) {
					suppressStickyGlobalNavTransitionName = true
					if (leavingQuiz) deferringNavMode = true
					if (enteringQuiz) {
						document.documentElement.style.removeProperty(
							'--measured-global-nav-height'
						)
						document.documentElement.classList.add('quiz-entering')
					}
					if (leavingQuiz) {
						document.documentElement.classList.add('quiz-leaving')
					}
					await tick()
				}

				const vt = document.startViewTransition(async () => {
					resolve()
					await navigation.complete
					if (leavingQuiz) {
						deferringNavMode = false
					}
					if (includesQuizRoute) {
						suppressStickyGlobalNavTransitionName = false
					}
				})

				vt.finished.then(() => {
					document.documentElement.classList.remove(
						'quiz-entering',
						'quiz-leaving'
					)
					if (leavingQuiz) {
						navMode = 'default'
						deferringNavMode = false
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
		if (AppSettings.isProduction || event.defaultPrevented || event.repeat) {
			return
		}

		const isShortcutPressed =
			(event.metaKey || event.ctrlKey) &&
			event.shiftKey &&
			event.key.toLowerCase() === 'd'

		if (!isShortcutPressed) return

		event.preventDefault()
		toggleDevToolsVisibility()
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
