import { browser } from '$app/environment'
import { setLocale, locales, type Locale } from '$lib/paraglide/runtime.js'

if (browser) {
	const stored = document.cookie
		.split('; ')
		.find((c) => c.startsWith('PARAGLIDE_LOCALE='))
		?.split('=')[1]

	if (stored && locales.includes(stored as Locale)) {
		setLocale(stored as Locale, { reload: false })
	} else {
		const browserLang = navigator.language.split('-')[0]
		const match = locales.find((l) => l === browserLang)
		if (match) {
			setLocale(match, { reload: false })
		}
	}
}
