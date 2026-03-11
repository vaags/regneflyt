import * as m from '$lib/paraglide/messages.js'
import { getLocale, setLocale, type Locale } from '$lib/paraglide/runtime.js'

export const localeNames: Record<string, string> = {
	nb: 'Norsk bokmål',
	nn: 'Nynorsk',
	en: 'English',
	sv: 'Svenska',
	da: 'Dansk',
	fr: 'Français',
	de: 'Deutsch',
	es: 'Español',
	pl: 'Polski',
	uk: 'Українська',
	se: 'Davvisámegiella'
}

export function switchLocale(newLocale: Locale): Locale | null {
	if (newLocale === getLocale()) return null

	setLocale(newLocale, { reload: false })
	document.documentElement.lang = newLocale
	document.title = m.app_title_full()
	const desc = document.querySelector('meta[name="description"]')
	if (desc) desc.setAttribute('content', m.app_description())

	return newLocale
}
