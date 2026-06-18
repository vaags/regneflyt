import type { StickyGlobalNavStartActions } from '$lib/contexts/stickyGlobalNavContext'
import { buildCanonicalQuizPathFromSearchParams } from '$lib/helpers/quiz/quizPathHelper'
import {
	createCopySetupLinkToClipboard,
	type CopyFeedbackExecutor,
	type CopySetupLinkMessages,
	type LayoutLocationSnapshot,
	type SeedCache,
	type ShowToastOptions
} from '$lib/helpers/layout/layoutNavigationHelper'

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
