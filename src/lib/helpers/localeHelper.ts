import * as m from '$lib/paraglide/messages.js'
import { getLocale, setLocale, type Locale } from '$lib/paraglide/runtime.js'

export function getLocaleNames(): Record<string, string> {
	return {
		nb: m.locale_nb(),
		nn: m.locale_nn(),
		en: m.locale_en(),
		sv: m.locale_sv(),
		da: m.locale_da(),
		fr: m.locale_fr(),
		de: m.locale_de(),
		es: m.locale_es(),
		pl: m.locale_pl(),
		uk: m.locale_uk(),
		se: m.locale_se()
	}
}

export function switchLocale(newLocale: Locale): Locale | null {
	if (newLocale === getLocale()) return null

	setLocale(newLocale, { reload: false })

	return newLocale
}
