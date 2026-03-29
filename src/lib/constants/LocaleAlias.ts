import type { Locale } from '$lib/paraglide/runtime.js'

export const localeAliasByLanguageTag = {
	no: 'nb',
	nn: 'nb'
} as const satisfies Readonly<Record<string, Locale>>
