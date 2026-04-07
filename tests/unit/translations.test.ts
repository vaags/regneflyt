import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

const messagesDir = join(__dirname, '../../messages')

function loadAllTranslations(): Record<string, Record<string, string>> {
	const files = readdirSync(messagesDir).filter((f) => f.endsWith('.json'))
	const translations: Record<string, Record<string, string>> = {}
	for (const file of files) {
		const locale = file.replace('.json', '')
		translations[locale] = JSON.parse(
			readFileSync(join(messagesDir, file), 'utf-8')
		) as Record<string, string>
	}
	return translations
}

describe('translation files', () => {
	const translations = loadAllTranslations()
	const locales = Object.keys(translations)
	const baseLocale = 'nb'
	const baseKeys = Object.keys(translations[baseLocale]!).filter(
		(k) => !k.startsWith('$')
	)

	it('should have translation files for all configured locales', () => {
		const expected = ['nb', 'en', 'fr', 'de', 'es']
		expect(locales.sort()).toEqual(expected.sort())
	})

	for (const locale of locales) {
		if (locale === baseLocale) continue

		it(`${locale}.json should have the same keys as ${baseLocale}.json`, () => {
			const localeKeys = Object.keys(translations[locale]!).filter(
				(k) => !k.startsWith('$')
			)
			const missing = baseKeys.filter((k) => !localeKeys.includes(k))
			const extra = localeKeys.filter((k) => !baseKeys.includes(k))

			expect(
				missing,
				`${locale} is missing keys: ${missing.join(', ')}`
			).toEqual([])
			expect(extra, `${locale} has extra keys: ${extra.join(', ')}`).toEqual([])
		})
	}

	for (const locale of locales) {
		it(`${locale}.json should have no empty translations`, () => {
			const entries = Object.entries(translations[locale]!).filter(
				([k]) => !k.startsWith('$')
			)
			const empty = entries
				.filter(([, v]) => typeof v === 'string' && v.trim() === '')
				.map(([k]) => k)

			expect(empty, `${locale} has empty values: ${empty.join(', ')}`).toEqual(
				[]
			)
		})
	}
})
