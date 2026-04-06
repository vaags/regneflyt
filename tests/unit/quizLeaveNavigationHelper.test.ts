import { describe, expect, it, vi } from 'vitest'
import {
	createQuizLeaveNavigationGuard,
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

function createGuard(overrides: Partial<QuizLeaveNavigationState> = {}) {
	const state = getState(overrides)
	const navigate = vi.fn()
	const openQuitDialog = vi.fn()
	const currentLocation = {
		pathname: state.currentPath,
		search: '?operator=0&foo=bar'
	}

	const guard = createQuizLeaveNavigationGuard({
		state,
		navigate,
		openQuitDialog,
		getCurrentLocation: () => currentLocation
	})

	return {
		guard,
		state,
		navigate,
		openQuitDialog,
		currentLocation
	}
}

describe('quizLeaveNavigationHelper', () => {
	it('navigates immediately when not on quiz route', () => {
		const { guard, state, navigate, openQuitDialog, currentLocation } =
			createGuard({ currentPath: '/' })
		currentLocation.pathname = '/'

		guard.requestHeaderNavigation('/settings')

		expect(navigate).toHaveBeenCalledWith('/settings?operator=0')
		expect(openQuitDialog).not.toHaveBeenCalled()
		expect(state.pendingQuizNavigation).toBeUndefined()
	})

	it('opens quit dialog and stores pending navigation when on quiz route', () => {
		const { guard, state, navigate, openQuitDialog, currentLocation } =
			createGuard({ currentPath: '/quiz' })
		currentLocation.pathname = '/quiz'

		guard.requestHeaderNavigation('/settings')

		expect(navigate).not.toHaveBeenCalled()
		expect(openQuitDialog).toHaveBeenCalledTimes(1)
		expect(state.pendingQuizNavigation).toBe('/settings?operator=0')
	})

	it('does nothing when header target matches current pathname', () => {
		const { guard, state, navigate, openQuitDialog, currentLocation } =
			createGuard({ currentPath: '/' })
		currentLocation.pathname = '/'

		guard.requestHeaderNavigation('/')

		expect(navigate).not.toHaveBeenCalled()
		expect(openQuitDialog).not.toHaveBeenCalled()
		expect(state.pendingQuizNavigation).toBeUndefined()
	})

	it('confirms pending navigation and marks bypass for the next quiz exit', () => {
		const { guard, state, navigate } = createGuard({
			pendingQuizNavigation: '/settings?operator=0'
		})

		guard.confirmPendingQuizLeaveNavigation()

		expect(navigate).toHaveBeenCalledWith('/settings?operator=0')
		expect(state.pendingQuizNavigation).toBeUndefined()
		expect(state.allowNextQuizNavigation).toBe(true)
	})

	it('requests quiz exit confirmation for non-header navigation', () => {
		const { guard, state, openQuitDialog } = createGuard({
			currentPath: '/quiz'
		})
		const cancelNavigation = vi.fn()
		const toUrl = new URL('https://example.com/settings?operator=0&foo=bar')

		guard.handleBeforeNavigate({
			toUrl,
			isInternalNavigation: true,
			cancelNavigation
		})

		expect(cancelNavigation).toHaveBeenCalledTimes(1)
		expect(openQuitDialog).toHaveBeenCalledTimes(1)
		expect(state.pendingQuizNavigation).toBe('/settings?operator=0')
	})

	it('does not cancel when quiz navigation is already allowed', () => {
		const { guard, openQuitDialog } = createGuard({
			currentPath: '/quiz',
			allowNextQuizNavigation: true
		})
		const cancelNavigation = vi.fn()
		const toUrl = new URL('https://example.com/settings?operator=0')

		guard.handleBeforeNavigate({
			toUrl,
			isInternalNavigation: true,
			cancelNavigation
		})

		expect(cancelNavigation).not.toHaveBeenCalled()
		expect(openQuitDialog).not.toHaveBeenCalled()
	})

	it('does not intercept external or non-app navigations', () => {
		const { guard, state, openQuitDialog } = createGuard({
			currentPath: '/quiz'
		})
		const cancelNavigation = vi.fn()
		const toUrl = new URL('https://example.com/settings?operator=0')

		guard.handleBeforeNavigate({
			toUrl,
			isInternalNavigation: false,
			cancelNavigation
		})

		expect(cancelNavigation).not.toHaveBeenCalled()
		expect(openQuitDialog).not.toHaveBeenCalled()
		expect(state.pendingQuizNavigation).toBeUndefined()
	})

	it('requests confirmation for quiz-local menu exits', () => {
		const { guard, state, navigate, openQuitDialog, currentLocation } =
			createGuard({ currentPath: '/quiz' })
		currentLocation.pathname = '/quiz'
		currentLocation.search = '?duration=0&operator=0'

		guard.requestQuizLeaveNavigation('/?duration=0&operator=0')

		expect(navigate).not.toHaveBeenCalled()
		expect(openQuitDialog).toHaveBeenCalledTimes(1)
		expect(state.pendingQuizNavigation).toBe('/?duration=0&operator=0')
	})

	it('bypasses confirmation for allowed quiz exits', () => {
		const { guard, state, navigate } = createGuard({ currentPath: '/quiz' })

		guard.navigateWithQuizLeaveBypass('/results?duration=0&operator=0')

		expect(navigate).toHaveBeenCalledWith('/results?duration=0&operator=0')
		expect(state.allowNextQuizNavigation).toBe(true)
	})

	it('syncs path and clears pending guard state on navigation', () => {
		const { guard, state } = createGuard({
			currentPath: '/quiz',
			pendingQuizNavigation: '/settings?operator=0',
			allowNextQuizNavigation: true
		})

		guard.syncOnNavigate('/settings')

		expect(state.currentPath).toBe('/settings')
		expect(state.pendingQuizNavigation).toBeUndefined()
		expect(state.allowNextQuizNavigation).toBe(false)
	})

	it('maintains quiz-leave invariants across key flows', () => {
		type Scenario = {
			name: string
			setup: () => ReturnType<typeof createGuard>
			act: (ctx: ReturnType<typeof createGuard>) => void
			expectState: (ctx: ReturnType<typeof createGuard>) => void
			expectCalls: (ctx: ReturnType<typeof createGuard>) => void
		}

		const scenarios: Scenario[] = [
			{
				name: 'requires confirmation when leaving quiz without bypass',
				setup: () => createGuard({ currentPath: '/quiz' }),
				act: (ctx) => {
					ctx.currentLocation.pathname = '/quiz'
					ctx.currentLocation.search = '?duration=0&operator=0'
					ctx.guard.requestQuizLeaveNavigation(
						'/settings?duration=0&operator=0'
					)
				},
				expectState: (ctx) => {
					expect(ctx.state.pendingQuizNavigation).toBe(
						'/settings?duration=0&operator=0'
					)
					expect(ctx.state.allowNextQuizNavigation).toBe(false)
				},
				expectCalls: (ctx) => {
					expect(ctx.openQuitDialog).toHaveBeenCalledTimes(1)
					expect(ctx.navigate).not.toHaveBeenCalled()
				}
			},
			{
				name: 'bypass allows next leave immediately',
				setup: () => createGuard({ currentPath: '/quiz' }),
				act: (ctx) => {
					ctx.guard.navigateWithQuizLeaveBypass(
						'/results?duration=0&operator=0'
					)
				},
				expectState: (ctx) => {
					expect(ctx.state.pendingQuizNavigation).toBeUndefined()
					expect(ctx.state.allowNextQuizNavigation).toBe(true)
				},
				expectCalls: (ctx) => {
					expect(ctx.navigate).toHaveBeenCalledWith(
						'/results?duration=0&operator=0'
					)
					expect(ctx.openQuitDialog).not.toHaveBeenCalled()
				}
			},
			{
				name: 'sync resets pending and bypass flags',
				setup: () =>
					createGuard({
						currentPath: '/quiz',
						pendingQuizNavigation: '/settings?operator=0',
						allowNextQuizNavigation: true
					}),
				act: (ctx) => {
					ctx.guard.syncOnNavigate('/settings')
				},
				expectState: (ctx) => {
					expect(ctx.state.currentPath).toBe('/settings')
					expect(ctx.state.pendingQuizNavigation).toBeUndefined()
					expect(ctx.state.allowNextQuizNavigation).toBe(false)
				},
				expectCalls: (ctx) => {
					expect(ctx.navigate).not.toHaveBeenCalled()
					expect(ctx.openQuitDialog).not.toHaveBeenCalled()
				}
			}
		]

		for (const scenario of scenarios) {
			const ctx = scenario.setup()
			scenario.act(ctx)
			scenario.expectState(ctx)
			scenario.expectCalls(ctx)
		}
	})
})
