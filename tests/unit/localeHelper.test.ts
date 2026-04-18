import { beforeEach, describe, expect, it, vi } from 'vitest'

const runtimeMocks = vi.hoisted(() => ({
	setLocaleMock: vi.fn(),
	currentLocale: 'en'
}))

vi.mock('$lib/paraglide/messages.js', () => ({
	locale_nb: () => 'Norsk bokmal',
	locale_en: () => 'English',
	locale_fr: () => 'Francais',
	locale_de: () => 'Deutsch',
	locale_es: () => 'Espanol'
}))

vi.mock('$lib/paraglide/runtime.js', () => ({
	getLocale: () => runtimeMocks.currentLocale,
	setLocale: runtimeMocks.setLocaleMock
}))

import { switchLocale } from '$lib/helpers/localeHelper'

describe('localeHelper switchLocale', () => {
	beforeEach(() => {
		runtimeMocks.setLocaleMock.mockReset()
		runtimeMocks.currentLocale = 'en'
	})

	it('returns undefined when locale does not change', () => {
		expect(switchLocale('en')).toBeUndefined()
		expect(runtimeMocks.setLocaleMock).not.toHaveBeenCalled()
	})

	it('sets locale and returns new locale when locale changes', () => {
		expect(switchLocale('nb')).toBe('nb')
		expect(runtimeMocks.setLocaleMock).toHaveBeenCalledWith('nb', {
			reload: false
		})
	})
})
