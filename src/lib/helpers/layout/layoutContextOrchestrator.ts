import type { Locale } from '$lib/paraglide/runtime.js'
import { setQuizLeaveNavigationContext } from '$lib/contexts/quizLeaveNavigationContext'
import { setSettingsRouteContext } from '$lib/contexts/settingsRouteContext'
import {
	setStickyGlobalNavContext,
	type StickyGlobalNavQuizControls,
	type StickyGlobalNavStartActions
} from '$lib/contexts/stickyGlobalNavContext'
import {
	registerStickyStartActions,
	simulateUpdateNotificationAfterEnsure,
	switchLocaleWithOverride
} from '$lib/helpers/layout/layoutActionsHelper'

type QuizLeaveNavigationGuardContext = {
	requestQuizLeaveNavigation: (destination: string) => void
	navigateWithQuizLeaveBypass: (destination: string) => void
}

type StickyStartActionsRegistrarState = {
	getCurrentToken: () => number
	setToken: (token: number) => void
	setActions: (actions: StickyGlobalNavStartActions | undefined) => void
	resetToken: () => void
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

export function createStickyStartActionsRegistrar(
	state: StickyStartActionsRegistrarState
) {
	return (actions: StickyGlobalNavStartActions) => {
		return registerStickyStartActions(actions, state)
	}
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
			return switchLocaleWithOverride(
				nextLocale,
				switchLocale,
				setLocaleOverride
			)
		},
		simulateUpdateNotification: () => {
			void simulateUpdateNotificationAfterEnsure(
				ensureUpdateNotification,
				() => {
					getUpdateNotification()?.showNotification()
				}
			)
		}
	})

	setStickyGlobalNavContext({
		registerStartActions,
		setQuizControls
	})
}
