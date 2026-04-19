import type { LastResults } from '$lib/stores'
import type { StickyGlobalNavStartActions } from '$lib/contexts/stickyGlobalNavContext'
import {
	buildCanonicalQuizPathFromSearchParams,
	buildReplayQuizPath
} from '$lib/helpers/quiz/quizPathHelper'
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
	getLastResults: () => LastResults | null | undefined
	navigate: (destination: string) => void
	seedCache: SeedCache
	showToast: (message: string, options?: ShowToastOptions) => void
	copyTextWithFeedback: CopyFeedbackExecutor
	getWriteText: () => ((text: string) => Promise<void>) | undefined
	getMessages: () => CopySetupLinkMessages
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
	getLastResults,
	navigate,
	seedCache,
	showToast,
	copyTextWithFeedback,
	getWriteText,
	getMessages
}: LayoutNavigationActionsOptions) {
	const copySetupLink = createCopySetupLinkToClipboard({
		getStartActions,
		seedCache,
		showToast,
		copyTextWithFeedback,
		getWriteText
	})

	function getCurrentLocation() {
		return getLayoutLocationSnapshot(getLocation())
	}

	async function copySetupLinkToClipboard(deterministic = false) {
		const currentLocation = getCurrentLocation()
		await copySetupLink({
			deterministic,
			locationSearch: currentLocation.search,
			origin: currentLocation.origin,
			messages: getMessages()
		})
	}

	function startQuizFromCurrentQuery() {
		const searchParams = new URLSearchParams(getCurrentLocation().search)
		navigate(buildCanonicalQuizPathFromSearchParams(searchParams))
	}

	function replayLastQuizFromHistory() {
		const replayPath = buildReplayQuizPath(getLastResults())
		if (replayPath === undefined) return
		navigate(replayPath)
	}

	return {
		getCurrentLocation,
		copySetupLinkToClipboard,
		startQuizFromCurrentQuery,
		replayLastQuizFromHistory
	}
}
