import type { Locale } from '$lib/paraglide/runtime.js'
import { setQuizLeaveNavigationContext } from '$lib/contexts/quizLeaveNavigationContext'
import { setSettingsRouteContext } from '$lib/contexts/settingsRouteContext'
import {
	setStickyGlobalNavContext,
	type StickyGlobalNavQuizControls,
	type StickyGlobalNavStartActions
} from '$lib/contexts/stickyGlobalNavContext'
import { buildCanonicalQuizPathFromSearchParams } from '$lib/helpers/quiz/quizPathHelper'
import {
	createCopySetupLinkToClipboard,
	type CopyFeedbackExecutor,
	type CopySetupLinkMessages,
	type SeedCache,
	type ShowToastOptions
} from '$lib/helpers/layout/layoutCopyLinkHelper'
import type { LayoutLocationSnapshot } from '$lib/helpers/layout/layoutPageTitleHelper'

/**
 * Composition root for the app-level `+layout.svelte`: registers Svelte contexts
 * consumed by descendant routes, and builds the navigation/copy-link actions
 * used by the sticky global nav. Both groups of functions have exactly one
 * caller (`+layout.svelte`), so they're kept together in a single file rather
 * than split into separate "orchestrator" abstractions.
 */

type QuizLeaveNavigationGuardContext = {
	requestQuizLeaveNavigation: (destination: string) => void
	navigateWithQuizLeaveBypass: (destination: string) => void
}

type LayoutContextRegistrationOptions = {
	quizLeaveNavigationGuard: QuizLeaveNavigationGuardContext
	registerStartActions: (actions: StickyGlobalNavStartActions) => () => void
	setQuizControls: (controls: StickyGlobalNavQuizControls | undefined) => void
	switchLocale: (locale: Locale) => Locale | undefined
	setLocaleOverride: (locale: Locale) => void
	ensureUpdateNotification: () => Promise<void>
	getUpdateNotification: () => { showNotification: () => void } | undefined
}

export function registerLayoutContexts({
	quizLeaveNavigationGuard,
	registerStartActions,
	setQuizControls,
	switchLocale,
	setLocaleOverride,
	ensureUpdateNotification,
	getUpdateNotification
}: LayoutContextRegistrationOptions): void {
	setQuizLeaveNavigationContext({
		requestQuizLeaveNavigation:
			quizLeaveNavigationGuard.requestQuizLeaveNavigation,
		navigateWithQuizLeaveBypass:
			quizLeaveNavigationGuard.navigateWithQuizLeaveBypass
	})

	setSettingsRouteContext({
		switchLocale: (nextLocale: Locale) => {
			const newLocale = switchLocale(nextLocale)
			if (!newLocale) return undefined
			setLocaleOverride(newLocale)
			return newLocale
		},
		simulateUpdateNotification: () => {
			async function runSimulatedUpdateNotification(): Promise<void> {
				await ensureUpdateNotification()
				getUpdateNotification()?.showNotification()
			}

			void runSimulatedUpdateNotification()
		}
	})

	setStickyGlobalNavContext({
		registerStartActions,
		setQuizControls
	})
}

type LayoutNavigationActionsOptions = {
	getLocation: () => Pick<Location, 'pathname' | 'search' | 'origin'>
	getStartActions: () => StickyGlobalNavStartActions | undefined
	navigation: {
		navigate: (destination: string) => void
	}
	seedCache: SeedCache
	clipboard: {
		showToast: (message: string, options?: ShowToastOptions) => void
		copyTextWithFeedback: CopyFeedbackExecutor
		getWriteText: () => ((text: string) => Promise<void>) | undefined
	}
	getMessages: () => CopySetupLinkMessages
}

type LayoutNavigationActions = {
	getCurrentLocation: () => LayoutLocationSnapshot & { origin: string }
	copySetupLinkToClipboard: (deterministic?: boolean) => Promise<void>
	startQuizFromCurrentQuery: () => void
}

export function getLayoutLocationSnapshot(
	location: Pick<Location, 'pathname' | 'search' | 'origin'>
): LayoutLocationSnapshot & { origin: string } {
	return {
		pathname: location.pathname,
		search: location.search,
		origin: location.origin
	}
}

export function createLayoutNavigationActions({
	getLocation,
	getStartActions,
	navigation,
	seedCache,
	clipboard,
	getMessages
}: LayoutNavigationActionsOptions): LayoutNavigationActions {
	const copySetupLink = createCopySetupLinkToClipboard({
		getStartActions,
		seedCache,
		showToast: clipboard.showToast,
		copyTextWithFeedback: clipboard.copyTextWithFeedback,
		getWriteText: clipboard.getWriteText
	})

	function getCurrentLocation(): LayoutLocationSnapshot & { origin: string } {
		return getLayoutLocationSnapshot(getLocation())
	}

	async function copySetupLinkToClipboard(
		deterministic = false
	): Promise<void> {
		const currentLocation = getCurrentLocation()
		await copySetupLink({
			deterministic,
			locationSearch: currentLocation.search,
			origin: currentLocation.origin,
			messages: getMessages()
		})
	}

	function startQuizFromCurrentQuery(): void {
		const searchParams = new URLSearchParams(getCurrentLocation().search)
		navigation.navigate(buildCanonicalQuizPathFromSearchParams(searchParams))
	}

	return {
		getCurrentLocation,
		copySetupLinkToClipboard,
		startQuizFromCurrentQuery
	}
}
