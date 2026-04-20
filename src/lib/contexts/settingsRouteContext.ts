import { getContext, setContext } from 'svelte'
import type { Locale } from '$lib/paraglide/runtime.js'

export type SettingsRouteContext = {
	switchLocale: (locale: Locale) => Locale | undefined
	simulateUpdateNotification: () => void
}

const settingsRouteContextKey = Symbol('settings-route-context')

export function setSettingsRouteContext(context: SettingsRouteContext): void {
	setContext(settingsRouteContextKey, context)
}

export function getSettingsRouteContext(): SettingsRouteContext {
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
