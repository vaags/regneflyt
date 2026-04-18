import {
	locale_de,
	locale_en,
	locale_es,
	locale_fr,
	locale_nb
} from '$lib/paraglide/messages.js'
import { getLocale, setLocale, type Locale } from '$lib/paraglide/runtime.js'

export function getLocaleNames(): Record<string, string> {
	return {
		nb: locale_nb(),
		en: locale_en(),
		fr: locale_fr(),
		de: locale_de(),
		es: locale_es()
	}
}

export function switchLocale(newLocale: Locale): Locale | undefined {
	if (newLocale === getLocale()) return undefined

	void setLocale(newLocale, { reload: false })

	return newLocale
}
