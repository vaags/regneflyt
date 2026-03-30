import { buildPathWithQuizQueryParams } from '$lib/helpers/urlParamsHelper'

export type QuizLeaveNavigationPath = '/' | '/results' | '/settings'

export type QuizLeaveNavigationState = {
	currentPath: string
	pendingQuizNavigation: string | undefined
	allowNextQuizNavigation: boolean
}

type NavigateTo = (destination: string) => void

type RequestHeaderNavigationOptions = {
	state: QuizLeaveNavigationState
	path: QuizLeaveNavigationPath
	currentLocation: {
		pathname: string
		search: string
	}
	navigate: NavigateTo
	openQuitDialog: () => void
}

type ConfirmPendingQuizLeaveNavigationOptions = {
	state: QuizLeaveNavigationState
	navigate: NavigateTo
}

type RequestQuizLeaveNavigationOptions = {
	state: QuizLeaveNavigationState
	destination: string
	currentLocation: {
		pathname: string
		search: string
	}
	navigate: NavigateTo
	openQuitDialog: () => void
}

type NavigateWithQuizLeaveBypassOptions = {
	state: QuizLeaveNavigationState
	destination: string
	navigate: NavigateTo
}

type QuizLeaveBeforeNavigateOptions = {
	state: QuizLeaveNavigationState
	toUrl: URL
	isInternalNavigation: boolean
	cancelNavigation: () => void
	openQuitDialog: () => void
}

function buildHeaderDestinationWithCurrentQueryParams(
	path: QuizLeaveNavigationPath,
	search: string
) {
	return buildPathWithQuizQueryParams(path, new URLSearchParams(search))
}

function buildQuizLeaveDestination(toUrl: URL) {
	return buildPathWithQuizQueryParams(
		toUrl.pathname,
		toUrl.searchParams,
		toUrl.hash
	)
}

export function requestQuizLeaveNavigation({
	state,
	destination,
	currentLocation,
	navigate,
	openQuitDialog
}: RequestQuizLeaveNavigationOptions) {
	const current = `${currentLocation.pathname}${currentLocation.search}`

	if (destination === current) return

	if (state.currentPath === '/quiz') {
		state.pendingQuizNavigation = destination
		openQuitDialog()
		return
	}

	navigate(destination)
}

export function navigateWithQuizLeaveBypass({
	state,
	destination,
	navigate
}: NavigateWithQuizLeaveBypassOptions) {
	state.pendingQuizNavigation = undefined
	state.allowNextQuizNavigation = true
	navigate(destination)
}

export function requestHeaderNavigation({
	state,
	path,
	currentLocation,
	navigate,
	openQuitDialog
}: RequestHeaderNavigationOptions) {
	if (currentLocation.pathname === path) return

	requestQuizLeaveNavigation({
		state,
		destination: buildHeaderDestinationWithCurrentQueryParams(
			path,
			currentLocation.search
		),
		currentLocation,
		navigate,
		openQuitDialog
	})
}

export function confirmPendingQuizLeaveNavigation({
	state,
	navigate
}: ConfirmPendingQuizLeaveNavigationOptions) {
	if (!state.pendingQuizNavigation) return
	navigateWithQuizLeaveBypass({
		state,
		destination: state.pendingQuizNavigation,
		navigate
	})
}

export function handleQuizLeaveBeforeNavigate({
	state,
	toUrl,
	isInternalNavigation,
	cancelNavigation,
	openQuitDialog
}: QuizLeaveBeforeNavigateOptions) {
	if (
		!isInternalNavigation ||
		state.currentPath !== '/quiz' ||
		toUrl.pathname === '/quiz' ||
		state.allowNextQuizNavigation
	) {
		return
	}

	cancelNavigation()
	state.pendingQuizNavigation = buildQuizLeaveDestination(toUrl)
	openQuitDialog()
}

export function syncQuizLeaveNavigationStateOnNavigate(
	state: QuizLeaveNavigationState,
	nextPath: string | undefined
) {
	if (nextPath) {
		state.currentPath = nextPath
	}

	state.pendingQuizNavigation = undefined
	state.allowNextQuizNavigation = false
}
