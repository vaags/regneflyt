import { buildPathWithQuizQueryParams } from '$lib/helpers/urlParamsHelper'

export type QuizLeaveNavigationPath = '/' | '/results' | '/settings'

export type QuizLeaveNavigationState = {
	currentPath: string
	pendingQuizNavigation: string | undefined
	allowNextQuizNavigation: boolean
}

type NavigationDecision =
	| { type: 'noop' }
	| { type: 'navigate'; destination: string }
	| { type: 'confirm'; pendingDestination: string }

type InterceptDecision =
	| { type: 'noop' }
	| { type: 'confirm'; pendingDestination: string }

type CurrentLocation = {
	pathname: string
	search: string
}

const QUIZ_ROUTE = '/quiz'

type NavigateTo = (destination: string) => void

type GuardOptions = {
	state: QuizLeaveNavigationState
	navigate: NavigateTo
	openQuitDialog: () => void
	getCurrentLocation: () => CurrentLocation
}

type HandleBeforeNavigateOptions = {
	toUrl: URL
	isInternalNavigation: boolean
	cancelNavigation: () => void
}

type QuizLeaveNavigationGuard = {
	requestHeaderNavigation: (path: QuizLeaveNavigationPath) => void
	requestQuizLeaveNavigation: (destination: string) => void
	navigateWithQuizLeaveBypass: (destination: string) => void
	confirmPendingQuizLeaveNavigation: () => void
	handleBeforeNavigate: (options: HandleBeforeNavigateOptions) => void
	syncOnNavigate: (nextPath: string | undefined) => void
}

function buildHeaderDestinationWithCurrentQueryParams(
	path: QuizLeaveNavigationPath,
	search: string
): string {
	return buildPathWithQuizQueryParams(path, new URLSearchParams(search))
}

function buildQuizLeaveDestination(toUrl: URL): string {
	return buildPathWithQuizQueryParams(
		toUrl.pathname,
		toUrl.searchParams,
		toUrl.hash
	)
}

function decideQuizLeaveNavigation(
	state: QuizLeaveNavigationState,
	destination: string,
	currentPathWithSearch: string
): NavigationDecision {
	if (destination === currentPathWithSearch) {
		return { type: 'noop' }
	}

	if (state.currentPath === QUIZ_ROUTE) {
		return {
			type: 'confirm',
			pendingDestination: destination
		}
	}

	return {
		type: 'navigate',
		destination
	}
}

function decideQuizLeaveIntercept(
	state: QuizLeaveNavigationState,
	isInternalNavigation: boolean,
	toPathname: string,
	destination: string
): InterceptDecision {
	if (
		!isInternalNavigation ||
		state.currentPath !== QUIZ_ROUTE ||
		toPathname === QUIZ_ROUTE ||
		state.allowNextQuizNavigation
	) {
		return { type: 'noop' }
	}

	return {
		type: 'confirm',
		pendingDestination: destination
	}
}

function requestQuizLeaveNavigationWithCurrentLocation(
	state: QuizLeaveNavigationState,
	destination: string,
	currentLocation: CurrentLocation
): NavigationDecision {
	return decideQuizLeaveNavigation(
		state,
		destination,
		`${currentLocation.pathname}${currentLocation.search}`
	)
}

function requestQuizLeaveNavigationWithSnapshot(
	state: QuizLeaveNavigationState,
	destination: string,
	getCurrentLocation: () => CurrentLocation
): NavigationDecision {
	return requestQuizLeaveNavigationWithCurrentLocation(
		state,
		destination,
		getCurrentLocation()
	)
}

function applyNavigationDecision(
	decision: NavigationDecision,
	state: QuizLeaveNavigationState,
	navigate: NavigateTo,
	openQuitDialog: () => void
): void {
	if (decision.type === 'noop') return

	if (decision.type === 'confirm') {
		state.pendingQuizNavigation = decision.pendingDestination
		openQuitDialog()
		return
	}

	navigate(decision.destination)
}

// Invariants:
// 1) Leaving '/quiz' requires confirmation unless allowNextQuizNavigation is true.
// 2) navigateWithQuizLeaveBypass allows exactly the next leave by setting allowNextQuizNavigation.
// 3) syncOnNavigate always clears pending destination and resets allowNextQuizNavigation.
export function createQuizLeaveNavigationGuard({
	state,
	navigate,
	openQuitDialog,
	getCurrentLocation
}: GuardOptions): QuizLeaveNavigationGuard {
	function requestQuizLeaveNavigation(destination: string): void {
		applyNavigationDecision(
			requestQuizLeaveNavigationWithSnapshot(
				state,
				destination,
				getCurrentLocation
			),
			state,
			navigate,
			openQuitDialog
		)
	}

	function navigateWithQuizLeaveBypass(destination: string): void {
		state.pendingQuizNavigation = undefined
		state.allowNextQuizNavigation = true
		navigate(destination)
	}

	function requestHeaderNavigation(path: QuizLeaveNavigationPath): void {
		const currentLocation = getCurrentLocation()
		if (currentLocation.pathname === path) return

		applyNavigationDecision(
			requestQuizLeaveNavigationWithCurrentLocation(
				state,
				buildHeaderDestinationWithCurrentQueryParams(
					path,
					currentLocation.search
				),
				currentLocation
			),
			state,
			navigate,
			openQuitDialog
		)
	}

	function confirmPendingQuizLeaveNavigation(): void {
		if (state.pendingQuizNavigation === undefined) return
		navigateWithQuizLeaveBypass(state.pendingQuizNavigation)
	}

	function handleBeforeNavigate({
		toUrl,
		isInternalNavigation,
		cancelNavigation
	}: HandleBeforeNavigateOptions): void {
		const destination = buildQuizLeaveDestination(toUrl)
		const decision = decideQuizLeaveIntercept(
			state,
			isInternalNavigation,
			toUrl.pathname,
			destination
		)

		if (decision.type !== 'confirm') return

		cancelNavigation()
		state.pendingQuizNavigation = decision.pendingDestination
		openQuitDialog()
	}

	function syncOnNavigate(nextPath: string | undefined): void {
		if (nextPath !== undefined) {
			state.currentPath = nextPath
		}

		state.pendingQuizNavigation = undefined
		state.allowNextQuizNavigation = false
	}

	return {
		requestHeaderNavigation,
		requestQuizLeaveNavigation,
		navigateWithQuizLeaveBypass,
		confirmPendingQuizLeaveNavigation,
		handleBeforeNavigate,
		syncOnNavigate
	}
}
