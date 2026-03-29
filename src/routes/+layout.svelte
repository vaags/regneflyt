<script lang="ts">
	import '../app.css'
	import { onMount, tick, type Component } from 'svelte'
	import { beforeNavigate, goto, onNavigate } from '$app/navigation'
	import type { LayoutData } from './$types'
	import type { Snippet } from 'svelte'
	import {
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
	import { type Locale, getLocale } from '$lib/paraglide/runtime.js'
	import { AppSettings } from '$lib/constants/AppSettings'
	import { theme, applyTheme, toggleDevToolsVisibility } from '$lib/stores'
	import { switchLocale as doSwitchLocale } from '$lib/helpers/localeHelper'
	import {
		type QuizLeaveNavigationState,
		confirmPendingQuizLeaveNavigation,
		handleQuizLeaveBeforeNavigate,
		navigateWithQuizLeaveBypass as navigateWithQuizLeaveBypassFromHelper,
		requestQuizLeaveHeaderNavigation,
		requestQuizLeaveNavigation as requestQuizLeaveNavigationFromHelper,
		syncQuizLeaveNavigationStateOnNavigate
	} from '$lib/helpers/quizLeaveNavigationHelper'
	import { setQuizLeaveNavigationContext } from '$lib/contexts/quizLeaveNavigationContext'
	import { setSettingsRouteContext } from '$lib/contexts/settingsRouteContext'
	import AppShell from '$lib/components/layout/AppShell.svelte'
	import DialogComponent from '$lib/components/widgets/DialogComponent.svelte'

	let { children, data }: { children: Snippet; data: LayoutData } = $props()

	let locale = $state<Locale>(getLocale())
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
	let quizLeaveNavigationState = $state<QuizLeaveNavigationState>({
		currentPath: '',
		pendingQuizNavigation: undefined,
		allowNextQuizNavigation: false
	})
	let isSettingsRoute = $derived(data.pathname === '/settings')
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

	function getQuizLeaveNavigationRequestOptions() {
		return {
			state: quizLeaveNavigationState,
			currentLocation: getCurrentLocation(),
			navigate: goto,
			openQuitDialog: openQuizLeaveDialog
		}
	}

	function requestHeaderNavigation(path: '/' | '/settings') {
		requestQuizLeaveHeaderNavigation({
			path,
			...getQuizLeaveNavigationRequestOptions()
		})
	}

	function confirmQuizLeaveNavigation() {
		confirmPendingQuizLeaveNavigation({
			state: quizLeaveNavigationState,
			navigate: goto
		})
	}

	function requestQuizLeaveNavigation(destination: string) {
		requestQuizLeaveNavigationFromHelper({
			destination,
			...getQuizLeaveNavigationRequestOptions()
		})
	}

	function navigateWithQuizLeaveBypass(destination: string) {
		navigateWithQuizLeaveBypassFromHelper({
			state: quizLeaveNavigationState,
			destination,
			navigate: goto
		})
	}

	setQuizLeaveNavigationContext({
		requestQuizLeaveNavigation,
		navigateWithQuizLeaveBypass
	})

	setSettingsRouteContext({
		switchLocale: switchLocaleFromSettingsRoute,
		simulateUpdateNotification
	})

	function switchLocaleFromSettingsRoute(nextLocale: Locale) {
		const newLocale = doSwitchLocale(nextLocale)
		if (!newLocale) return undefined
		locale = newLocale
		return newLocale
	}

	async function simulateUpdateNotification() {
		await ensureUpdateNotification()
		updateNotification?.showNotification()
	}

	$effect(() => {
		locale

		if (typeof document !== 'undefined') {
			document.documentElement.lang = getLocale()
		}
	})

	$effect(() => {
		quizLeaveNavigationState.currentPath = data.pathname
	})

	onMount(() => {
		document.documentElement.style.setProperty(
			'--theme-transition-ms',
			`${AppSettings.transitionDuration.duration}ms`
		)
		document.documentElement.style.setProperty(
			'--page-transition-ms',
			`${AppSettings.pageTransitionDuration.duration}ms`
		)
		applyTheme($theme)
		void ensureUpdateNotification()

		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
		const onThemePreferenceChange = () => {
			if ($theme === 'system') applyTheme('system')
		}
		mediaQuery.addEventListener('change', onThemePreferenceChange)

		return () => {
			mediaQuery.removeEventListener('change', onThemePreferenceChange)
		}
	})

	beforeNavigate((navigation) => {
		const to = navigation.to
		if (!to) return

		handleQuizLeaveBeforeNavigate({
			state: quizLeaveNavigationState,
			toUrl: to.url,
			isInternalNavigation: !!to.route?.id,
			cancelNavigation: () => navigation.cancel(),
			openQuitDialog: openQuizLeaveDialog
		})
	})

	onNavigate((navigation) => {
		syncQuizLeaveNavigationStateOnNavigate(
			quizLeaveNavigationState,
			navigation.to?.url.pathname
		)

		if (!document.startViewTransition) return
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve()
				await navigation.complete
			})
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

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={app_description({}, { locale })} />
</svelte:head>

<svelte:window onkeydown={onDevToolsShortcut} />

<svelte:boundary onerror={handleError}>
	<AppShell
		{isSettingsRoute}
		{locale}
		onOpenSkillDialog={openSkillDialog}
		onRequestHeaderNavigation={requestHeaderNavigation}
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
