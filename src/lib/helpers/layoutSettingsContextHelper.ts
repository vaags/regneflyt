import type { Locale } from '$lib/paraglide/runtime.js'

export function switchLocaleWithOverride(
	nextLocale: Locale,
	switchLocale: (locale: Locale) => Locale | undefined,
	setLocaleOverride: (locale: Locale) => void
): Locale | undefined {
	const newLocale = switchLocale(nextLocale)
	if (!newLocale) return undefined
	setLocaleOverride(newLocale)
	return newLocale
}

export async function simulateUpdateNotificationAfterEnsure(
	ensureUpdateNotification: () => Promise<void>,
	showUpdateNotification: () => void
): Promise<void> {
	await ensureUpdateNotification()
	showUpdateNotification()
}
