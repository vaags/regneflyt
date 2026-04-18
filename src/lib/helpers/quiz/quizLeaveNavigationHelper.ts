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

type RequestQuizLeaveNavigationDecisionOptions = {
	state: QuizLeaveNavigationState
	destination: string
	currentLocation: CurrentLocation
}

type RequestQuizLeaveNavigationOptions = {
	state: QuizLeaveNavigationState
	destination: string
	getCurrentLocation: () => CurrentLocation
}

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

type DecideQuizLeaveNavigationOptions = {
	state: QuizLeaveNavigationState
	destination: string
	currentPathWithSearch: string
}

type DecideQuizLeaveInterceptOptions = {
	state: QuizLeaveNavigationState
	isInternalNavigation: boolean
	toPathname: string
	destination: string
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
	options: DecideQuizLeaveNavigationOptions
): NavigationDecision {
	if (options.destination === options.currentPathWithSearch) {
		return { type: 'noop' }
	}

	if (options.state.currentPath === QUIZ_ROUTE) {
		return {
			type: 'confirm',
			pendingDestination: options.destination
		}
	}

	return {
		type: 'navigate',
		destination: options.destination
	}
}

function decideQuizLeaveIntercept(
	options: DecideQuizLeaveInterceptOptions
): InterceptDecision {
	if (
		!options.isInternalNavigation ||
		options.state.currentPath !== QUIZ_ROUTE ||
		options.toPathname === QUIZ_ROUTE ||
		options.state.allowNextQuizNavigation
	) {
		return { type: 'noop' }
	}

	return {
		type: 'confirm',
		pendingDestination: options.destination
	}
}

function requestQuizLeaveNavigationWithCurrentLocation({
	state,
	destination,
	currentLocation
}: RequestQuizLeaveNavigationDecisionOptions): NavigationDecision {
	const decision = decideQuizLeaveNavigation({
		state,
		destination,
		currentPathWithSearch: `${currentLocation.pathname}${currentLocation.search}`
	})

	return decision
}

function requestQuizLeaveNavigationWithSnapshot({
	state,
	destination,
	getCurrentLocation
}: RequestQuizLeaveNavigationOptions): NavigationDecision {
	return requestQuizLeaveNavigationWithCurrentLocation({
		state,
		destination,
		currentLocation: getCurrentLocation()
	})
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
}: GuardOptions) {
	function requestQuizLeaveNavigation(destination: string) {
		const decision = requestQuizLeaveNavigationWithSnapshot({
			state,
			destination,
			getCurrentLocation
		})

		if (decision.type === 'noop') return

		if (decision.type === 'confirm') {
			state.pendingQuizNavigation = decision.pendingDestination
			openQuitDialog()
			return
		}

		navigate(decision.destination)
	}

	function navigateWithQuizLeaveBypass(destination: string) {
		state.pendingQuizNavigation = undefined
		state.allowNextQuizNavigation = true
		navigate(destination)
	}

	function requestHeaderNavigation(path: QuizLeaveNavigationPath) {
		const currentLocation = getCurrentLocation()
		if (currentLocation.pathname === path) return

		const decision = requestQuizLeaveNavigationWithCurrentLocation({
			state,
			destination: buildHeaderDestinationWithCurrentQueryParams(
				path,
				currentLocation.search
			),
			currentLocation
		})

		if (decision.type === 'noop') return

		if (decision.type === 'confirm') {
			state.pendingQuizNavigation = decision.pendingDestination
			openQuitDialog()
			return
		}

		navigate(decision.destination)
	}

	function confirmPendingQuizLeaveNavigation() {
		if (state.pendingQuizNavigation === undefined) return
		navigateWithQuizLeaveBypass(state.pendingQuizNavigation)
	}

	function handleBeforeNavigate({
		toUrl,
		isInternalNavigation,
		cancelNavigation
	}: HandleBeforeNavigateOptions) {
		const destination = buildQuizLeaveDestination(toUrl)
		const decision = decideQuizLeaveIntercept({
			state,
			isInternalNavigation,
			toPathname: toUrl.pathname,
			destination
		})

		if (decision.type !== 'confirm') return

		cancelNavigation()
		state.pendingQuizNavigation = decision.pendingDestination
		openQuitDialog()
	}

	function syncOnNavigate(nextPath: string | undefined) {
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
