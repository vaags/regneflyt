import {
	locale_da,
	locale_de,
	locale_en,
	locale_es,
	locale_fr,
	locale_nb,
	locale_nn,
	locale_pl,
	locale_se,
	locale_sv,
	locale_uk
} from '$lib/paraglide/messages.js'
import { getLocale, setLocale, type Locale } from '$lib/paraglide/runtime.js'

export function getLocaleNames(): Record<string, string> {
	return {
		nb: locale_nb(),
		nn: locale_nn(),
		en: locale_en(),
		sv: locale_sv(),
		da: locale_da(),
		fr: locale_fr(),
		de: locale_de(),
		es: locale_es(),
		pl: locale_pl(),
		uk: locale_uk(),
		se: locale_se()
	}
}

export function switchLocale(newLocale: Locale): Locale | null {
	if (newLocale === getLocale()) return null

	setLocale(newLocale, { reload: false })

	return newLocale
}
