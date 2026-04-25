import type { BeforeNavigate } from '@sveltejs/kit'
import { customDifficultyId } from '$lib/models/AdaptiveProfile'
import { parseQuizUrlQuery } from '$lib/models/quizQuerySchema'
import { getQuiz } from '$lib/helpers/quiz/quizHelper'
import { buildCopyLinkUrl, buildQuizParams } from '$lib/helpers/urlParamsHelper'

export type LayoutLocationSnapshot = {
	pathname: string
	search: string
}

// ============================================================================
// Page Title Management (from layoutHelper.ts)
// ============================================================================

export type LayoutPageTitleKey =
	| 'home'
	| 'quiz'
	| 'results'
	| 'settings'
	| 'default'

const layoutPageTitleKeys: readonly LayoutPageTitleKey[] = [
	'home',
	'quiz',
	'results',
	'settings',
	'default'
]

export type LayoutPageTitleMessages = {
	appTitleFull: string
	appTitle: string
	quizTitle: string
	resultsTitle: string
	settingsTitle: string
}

function isLayoutPageTitleKey(value: string): value is LayoutPageTitleKey {
	return layoutPageTitleKeys.some((key) => key === value)
}

export function normalizeLayoutPageTitleKey(
	pageTitleKey: string
): LayoutPageTitleKey {
	if (isLayoutPageTitleKey(pageTitleKey)) {
		return pageTitleKey
	}

	// Preserve previous behavior for unknown keys.
	return 'settings'
}

export function getLayoutPageTitle(
	pageTitleKey: LayoutPageTitleKey,
	messages: LayoutPageTitleMessages
): string {
	if (pageTitleKey === 'home' || pageTitleKey === 'default') {
		return messages.appTitleFull
	}

	if (pageTitleKey === 'quiz') {
		return `${messages.quizTitle} - ${messages.appTitle}`
	}

	if (pageTitleKey === 'results') {
		return `${messages.resultsTitle} - ${messages.appTitle}`
	}

	return `${messages.settingsTitle} - ${messages.appTitle}`
}

export function getStickyGlobalNavTransitionName(
	pathname: string,
	suppressTransitionName: boolean
): string | undefined {
	if (suppressTransitionName) return undefined
	if (pathname === '/') return 'sticky-global-nav-menu'
	if (pathname === '/results') return 'sticky-global-nav-results'
	if (pathname === '/settings') return 'sticky-global-nav-settings'
	return undefined
}

// ============================================================================
// Before Navigate Handler (from layoutBeforeNavigateHelper.ts)
// ============================================================================

type GuardBeforeNavigateHandler = (options: {
	toUrl: URL
	isInternalNavigation: boolean
	cancelNavigation: () => void
}) => void

export function handleLayoutBeforeNavigate(
	to: BeforeNavigate['to'],
	cancelNavigation: () => void,
	handleBeforeNavigate: GuardBeforeNavigateHandler
): void {
	if (!to) return

	handleBeforeNavigate({
		toUrl: to.url,
		isInternalNavigation: Boolean(to.route.id),
		cancelNavigation
	})
}

// ============================================================================
// View Transitions (from layoutTransitionHelper.ts)
// ============================================================================

export type LayoutNavigationTransition = {
	shouldRunTransition: boolean
	includesQuizRoute: boolean
	leavingQuiz: boolean
	enteringQuiz: boolean
}

export type LayoutTransitionStartEffects = {
	suppressStickyGlobalNavTransitionName: boolean
	deferNavMode: boolean
	shouldAwaitTick: boolean
}

export type LayoutTransitionCompletionEffects = {
	resetDeferringNavMode: boolean
	restoreStickyGlobalNavTransitionName: boolean
}

export type LayoutTransitionFinishedEffects = {
	resetNavModeToDefault: boolean
	resetDeferringNavMode: boolean
}

type ViewTransition = {
	finished: Promise<void>
}

type LayoutTransitionDocumentTarget = {
	documentElement: HTMLElement
	startViewTransition(callback: () => Promise<void>): ViewTransition
}

type LayoutTransitionDocumentTargetLike = {
	documentElement: HTMLElement
	startViewTransition?:
		| ((callback: () => Promise<void>) => ViewTransition)
		| undefined
}

function resolveExecutableDocumentTarget(
	documentTarget: LayoutTransitionDocumentTargetLike | undefined
): LayoutTransitionDocumentTarget | undefined {
	if (!documentTarget?.startViewTransition) return undefined

	const startViewTransition = documentTarget.startViewTransition

	return {
		documentElement: documentTarget.documentElement,
		startViewTransition(callback: () => Promise<void>) {
			// Preserve the browser API receiver to avoid "Illegal invocation".
			return startViewTransition.call(documentTarget, callback)
		}
	}
}

export function resolveLayoutNavigationTransition(
	fromPath: string,
	toPath: string | undefined
): LayoutNavigationTransition {
	if (toPath === undefined || fromPath === toPath) {
		return {
			shouldRunTransition: false,
			includesQuizRoute: false,
			leavingQuiz: false,
			enteringQuiz: false
		}
	}

	const includesQuizRoute = fromPath === '/quiz' || toPath === '/quiz'
	const leavingQuiz = fromPath === '/quiz' && toPath !== '/quiz'
	const enteringQuiz = toPath === '/quiz' && fromPath !== '/quiz'

	return {
		shouldRunTransition: true,
		includesQuizRoute,
		leavingQuiz,
		enteringQuiz
	}
}

export function applyLayoutTransitionStartEffects(
	root: HTMLElement,
	transition: LayoutNavigationTransition
): LayoutTransitionStartEffects {
	if (!transition.includesQuizRoute) {
		return {
			suppressStickyGlobalNavTransitionName: false,
			deferNavMode: false,
			shouldAwaitTick: false
		}
	}

	if (transition.enteringQuiz) {
		root.style.removeProperty('--measured-global-nav-height')
		root.classList.add('quiz-entering')
	}

	if (transition.leavingQuiz) {
		root.classList.add('quiz-leaving')
	}

	return {
		suppressStickyGlobalNavTransitionName: true,
		deferNavMode: transition.leavingQuiz,
		shouldAwaitTick: true
	}
}

export function clearLayoutTransitionClasses(root: HTMLElement): void {
	root.classList.remove('quiz-entering', 'quiz-leaving')
}

export function getLayoutTransitionCompletionEffects(
	startEffects: LayoutTransitionStartEffects
): LayoutTransitionCompletionEffects {
	return {
		resetDeferringNavMode: startEffects.deferNavMode,
		restoreStickyGlobalNavTransitionName:
			startEffects.suppressStickyGlobalNavTransitionName
	}
}

export function getLayoutTransitionFinishedEffects(
	startEffects: LayoutTransitionStartEffects
): LayoutTransitionFinishedEffects {
	return {
		resetNavModeToDefault: startEffects.deferNavMode,
		resetDeferringNavMode: startEffects.deferNavMode
	}
}

export type LayoutNavigationTransitionExecution = {
	documentTarget: LayoutTransitionDocumentTarget
	transition: LayoutNavigationTransition
	navigationComplete: Promise<void>
	awaitTick: () => Promise<void>
	onBeforeNavigationCompleteResolved: () => void
	onSetStickyTransitionSuppressed: (suppressed: boolean) => void
	onSetDeferringNavMode: (defer: boolean) => void
	onResetNavModeToDefault: () => void
}

export type LayoutOnNavigateTransitionExecution = {
	fromPath: string
	toPath: string | undefined
	documentTarget: LayoutTransitionDocumentTargetLike | undefined
	navigationComplete: Promise<void>
	awaitTick: () => Promise<void>
	onSetStickyTransitionSuppressed: (suppressed: boolean) => void
	onSetDeferringNavMode: (defer: boolean) => void
	onResetNavModeToDefault: () => void
}

export function executeLayoutOnNavigateTransition({
	fromPath,
	toPath,
	documentTarget,
	navigationComplete,
	awaitTick,
	onSetStickyTransitionSuppressed,
	onSetDeferringNavMode,
	onResetNavModeToDefault
}: LayoutOnNavigateTransitionExecution): Promise<void> | undefined {
	const executableDocumentTarget =
		resolveExecutableDocumentTarget(documentTarget)
	if (!executableDocumentTarget) return undefined

	const transition = resolveLayoutNavigationTransition(fromPath, toPath)
	if (!transition.shouldRunTransition) return undefined

	return new Promise((resolve) => {
		void executeLayoutNavigationTransition({
			documentTarget: executableDocumentTarget,
			transition,
			navigationComplete,
			awaitTick,
			onBeforeNavigationCompleteResolved: resolve,
			onSetStickyTransitionSuppressed,
			onSetDeferringNavMode,
			onResetNavModeToDefault
		})
	})
}

export async function executeLayoutNavigationTransition({
	documentTarget,
	transition,
	navigationComplete,
	awaitTick,
	onBeforeNavigationCompleteResolved,
	onSetStickyTransitionSuppressed,
	onSetDeferringNavMode,
	onResetNavModeToDefault
}: LayoutNavigationTransitionExecution): Promise<void> {
	const root = documentTarget.documentElement
	const startEffects = applyLayoutTransitionStartEffects(root, transition)
	const completionEffects = getLayoutTransitionCompletionEffects(startEffects)
	const finishedEffects = getLayoutTransitionFinishedEffects(startEffects)

	if (startEffects.suppressStickyGlobalNavTransitionName) {
		onSetStickyTransitionSuppressed(true)
	}
	if (startEffects.deferNavMode) {
		onSetDeferringNavMode(true)
	}
	if (startEffects.shouldAwaitTick) {
		await awaitTick()
	}

	const viewTransition = documentTarget.startViewTransition(async () => {
		onBeforeNavigationCompleteResolved()
		await navigationComplete
		if (completionEffects.resetDeferringNavMode) {
			onSetDeferringNavMode(false)
		}
		if (completionEffects.restoreStickyGlobalNavTransitionName) {
			onSetStickyTransitionSuppressed(false)
		}
	})

	void viewTransition.finished.then(() => {
		clearLayoutTransitionClasses(root)
		if (finishedEffects.resetNavModeToDefault) {
			onResetNavModeToDefault()
		}
		if (finishedEffects.resetDeferringNavMode) {
			onSetDeferringNavMode(false)
		}
	})
}

// ============================================================================
// Copy Link Management (from layoutCopyLinkHelper.ts)
// ============================================================================

type CopyLinkStartActions = {
	canCopyLink?: (() => boolean) | undefined
	getCopyLinkSearchParams?: (() => URLSearchParams) | undefined
}

export type SeedCache = {
	get(key: string): number | undefined
	set(key: string, value: number): void
}

export type ShowToastOptions = {
	variant?: 'success' | 'error'
}

export type CopyFeedbackExecutor = (
	text: string,
	options: {
		writeText: ((text: string) => Promise<void>) | undefined
		onSuccess: () => void
		onError: () => void
		logError: (message: string, error: unknown) => void
	}
) => Promise<void>

export type CopySetupLinkMessages = {
	validationError: string
	copyError: string
	deterministicSuccess: string
	standardSuccess: string
}

type CopySetupLinkExecutorOptions = {
	getStartActions: () => CopyLinkStartActions | undefined
	seedCache: SeedCache
	showToast: (message: string, options?: ShowToastOptions) => void
	copyTextWithFeedback: CopyFeedbackExecutor
	getWriteText: () => ((text: string) => Promise<void>) | undefined
}

type CopySetupLinkRequest = {
	deterministic?: boolean
	locationSearch: string
	origin: string
	messages: CopySetupLinkMessages
}

export function shouldShowDeterministicCopyLinkAction(search: string): boolean {
	const parsedDifficulty = parseQuizUrlQuery(
		new URLSearchParams(search)
	).difficulty
	return parsedDifficulty === customDifficultyId
}

export function canCopyLink(
	startActions: CopyLinkStartActions | undefined
): boolean {
	if (!startActions?.canCopyLink) return true
	return startActions.canCopyLink()
}

export function resolveCopyLinkSearchParams(
	startActions: CopyLinkStartActions | undefined,
	locationSearch: string
): URLSearchParams {
	return (
		startActions?.getCopyLinkSearchParams?.() ??
		new URLSearchParams(locationSearch)
	)
}

export function resolveCopyLinkSuccessMessage(
	deterministic: boolean,
	messages: {
		deterministic: string
		standard: string
	}
): string {
	return deterministic ? messages.deterministic : messages.standard
}

export function getDeterministicSeedForQuery(
	searchParams: URLSearchParams,
	seedCache: SeedCache,
	random: () => number = Math.random
): number {
	const parsedSeed = parseQuizUrlQuery(searchParams).seed
	if (parsedSeed !== undefined) return parsedSeed

	const canonicalQueryKey = buildQuizParams(getQuiz(searchParams)).toString()
	const existingSeed = seedCache.get(canonicalQueryKey)
	if (existingSeed !== undefined) return existingSeed

	const generatedSeed = (random() * 0x100000000) >>> 0
	seedCache.set(canonicalQueryKey, generatedSeed)
	return generatedSeed
}

export function buildCanonicalCopyBaseUrl(
	searchParams: URLSearchParams,
	origin: string
): string {
	const canonicalQuiz = getQuiz(searchParams)
	const baseUrl = new URL(origin)
	baseUrl.pathname = '/'
	baseUrl.search = buildQuizParams(canonicalQuiz).toString()
	return baseUrl.toString()
}

export function createCopySetupLinkToClipboard({
	getStartActions,
	seedCache,
	showToast,
	copyTextWithFeedback,
	getWriteText
}: CopySetupLinkExecutorOptions) {
	return async function copySetupLinkToClipboard({
		deterministic = false,
		locationSearch,
		origin,
		messages
	}: CopySetupLinkRequest): Promise<void> {
		const startActions = getStartActions()
		const writeText = getWriteText()

		if (!canCopyLink(startActions)) {
			showToast(messages.validationError, { variant: 'error' })
			return
		}

		const searchParams = resolveCopyLinkSearchParams(
			startActions,
			locationSearch
		)
		const baseUrl = buildCanonicalCopyBaseUrl(searchParams, origin)
		const seed = deterministic
			? getDeterministicSeedForQuery(searchParams, seedCache)
			: undefined
		const successMessage = resolveCopyLinkSuccessMessage(deterministic, {
			deterministic: messages.deterministicSuccess,
			standard: messages.standardSuccess
		})

		await copyTextWithFeedback(buildCopyLinkUrl(baseUrl, seed), {
			writeText,
			onSuccess: () => {
				showToast(successMessage)
			},
			onError: () => {
				showToast(messages.copyError, { variant: 'error' })
			},
			logError: () => {
				// Errors are surfaced to the user via toast in onError.
			}
		})
	}
}
