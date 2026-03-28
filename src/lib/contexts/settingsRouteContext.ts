import { getContext, setContext } from 'svelte'

export type SettingsRouteContext = {
	switchLocale: (locale: string) => string | undefined
	simulateUpdateNotification: () => void
}

const settingsRouteContextKey = Symbol('settings-route-context')

export function setSettingsRouteContext(context: SettingsRouteContext) {
	setContext(settingsRouteContextKey, context)
}

export function getSettingsRouteContext() {
	const context = getContext<SettingsRouteContext | undefined>(
		settingsRouteContextKey
	)

	if (!context) {
		throw new Error(
			'Settings route context is not registered. Ensure +layout provides settings actions before using the settings route controls.'
		)
	}

	return context
}
