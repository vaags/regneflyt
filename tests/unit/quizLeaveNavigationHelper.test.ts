import { describe, expect, it, vi } from 'vitest'
import {
	confirmPendingQuizLeaveNavigation,
	handleQuizLeaveBeforeNavigate,
	navigateWithQuizLeaveBypass,
	requestHeaderNavigation,
	requestQuizLeaveNavigation,
	syncQuizLeaveNavigationStateOnNavigate,
	type QuizLeaveNavigationState
} from '$lib/helpers/quizLeaveNavigationHelper'

function getState(
	overrides: Partial<QuizLeaveNavigationState> = {}
): QuizLeaveNavigationState {
	return {
		currentPath: '/',
		pendingQuizNavigation: undefined,
		allowNextQuizNavigation: false,
		...overrides
	}
}

describe('quizLeaveNavigationHelper', () => {
	it('navigates immediately when not on quiz route', () => {
		const state = getState({ currentPath: '/' })
		const navigate = vi.fn()
		const openQuitDialog = vi.fn()

		requestHeaderNavigation({
			state,
			path: '/settings',
			currentLocation: {
				pathname: '/',
				search: '?operator=0&foo=bar'
			},
			navigate,
			openQuitDialog
		})

		expect(navigate).toHaveBeenCalledWith('/settings?operator=0')
		expect(openQuitDialog).not.toHaveBeenCalled()
		expect(state.pendingQuizNavigation).toBeUndefined()
	})

	it('opens quit dialog and stores pending navigation when on quiz route', () => {
		const state = getState({ currentPath: '/quiz' })
		const navigate = vi.fn()
		const openQuitDialog = vi.fn()

		requestHeaderNavigation({
			state,
			path: '/settings',
			currentLocation: {
				pathname: '/quiz',
				search: '?operator=0&foo=bar'
			},
			navigate,
			openQuitDialog
		})

		expect(navigate).not.toHaveBeenCalled()
		expect(openQuitDialog).toHaveBeenCalledTimes(1)
		expect(state.pendingQuizNavigation).toBe('/settings?operator=0')
	})

	it('does nothing when header target matches current pathname', () => {
		const state = getState({ currentPath: '/' })
		const navigate = vi.fn()
		const openQuitDialog = vi.fn()

		requestHeaderNavigation({
			state,
			path: '/',
			currentLocation: {
				pathname: '/',
				search: '?operator=0&foo=bar'
			},
			navigate,
			openQuitDialog
		})

		expect(navigate).not.toHaveBeenCalled()
		expect(openQuitDialog).not.toHaveBeenCalled()
		expect(state.pendingQuizNavigation).toBeUndefined()
	})

	it('confirms pending navigation and marks bypass for the next quiz exit', () => {
		const state = getState({ pendingQuizNavigation: '/settings?operator=0' })
		const navigate = vi.fn()

		confirmPendingQuizLeaveNavigation({ state, navigate })

		expect(navigate).toHaveBeenCalledWith('/settings?operator=0')
		expect(state.pendingQuizNavigation).toBeUndefined()
		expect(state.allowNextQuizNavigation).toBe(true)
	})

	it('requests quiz exit confirmation for non-header navigation', () => {
		const state = getState({ currentPath: '/quiz' })
		const cancelNavigation = vi.fn()
		const openQuitDialog = vi.fn()
		const toUrl = new URL('https://example.com/settings?operator=0&foo=bar')

		handleQuizLeaveBeforeNavigate({
			state,
			toUrl,
			isInternalNavigation: true,
			cancelNavigation,
			openQuitDialog
		})

		expect(cancelNavigation).toHaveBeenCalledTimes(1)
		expect(openQuitDialog).toHaveBeenCalledTimes(1)
		expect(state.pendingQuizNavigation).toBe('/settings?operator=0')
	})

	it('does not cancel when quiz navigation is already allowed', () => {
		const state = getState({
			currentPath: '/quiz',
			allowNextQuizNavigation: true
		})
		const cancelNavigation = vi.fn()
		const openQuitDialog = vi.fn()
		const toUrl = new URL('https://example.com/settings?operator=0')

		handleQuizLeaveBeforeNavigate({
			state,
			toUrl,
			isInternalNavigation: true,
			cancelNavigation,
			openQuitDialog
		})

		expect(cancelNavigation).not.toHaveBeenCalled()
		expect(openQuitDialog).not.toHaveBeenCalled()
	})

	it('does not intercept external or non-app navigations', () => {
		const state = getState({ currentPath: '/quiz' })
		const cancelNavigation = vi.fn()
		const openQuitDialog = vi.fn()
		const toUrl = new URL('https://example.com/settings?operator=0')

		handleQuizLeaveBeforeNavigate({
			state,
			toUrl,
			isInternalNavigation: false,
			cancelNavigation,
			openQuitDialog
		})

		expect(cancelNavigation).not.toHaveBeenCalled()
		expect(openQuitDialog).not.toHaveBeenCalled()
		expect(state.pendingQuizNavigation).toBeUndefined()
	})

	it('requests confirmation for quiz-local menu exits', () => {
		const state = getState({ currentPath: '/quiz' })
		const navigate = vi.fn()
		const openQuitDialog = vi.fn()

		requestQuizLeaveNavigation({
			state,
			destination: '/?duration=0&operator=0',
			currentLocation: {
				pathname: '/quiz',
				search: '?duration=0&operator=0'
			},
			navigate,
			openQuitDialog
		})

		expect(navigate).not.toHaveBeenCalled()
		expect(openQuitDialog).toHaveBeenCalledTimes(1)
		expect(state.pendingQuizNavigation).toBe('/?duration=0&operator=0')
	})

	it('bypasses confirmation for allowed quiz exits', () => {
		const state = getState({ currentPath: '/quiz' })
		const navigate = vi.fn()

		navigateWithQuizLeaveBypass({
			state,
			destination: '/results?duration=0&operator=0',
			navigate
		})

		expect(navigate).toHaveBeenCalledWith('/results?duration=0&operator=0')
		expect(state.allowNextQuizNavigation).toBe(true)
	})

	it('syncs path and clears pending guard state on navigation', () => {
		const state = getState({
			currentPath: '/quiz',
			pendingQuizNavigation: '/settings?operator=0',
			allowNextQuizNavigation: true
		})

		syncQuizLeaveNavigationStateOnNavigate(state, '/settings')

		expect(state.currentPath).toBe('/settings')
		expect(state.pendingQuizNavigation).toBeUndefined()
		expect(state.allowNextQuizNavigation).toBe(false)
	})
})
