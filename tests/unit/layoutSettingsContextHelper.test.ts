import { describe, expect, it, vi } from 'vitest'
import {
	simulateUpdateNotificationAfterEnsure,
	switchLocaleWithOverride
} from '$lib/helpers/layout/layoutSettingsContextHelper'

describe('switchLocaleWithOverride', () => {
	it('returns undefined and does not set override when switch fails', () => {
		const setLocaleOverride = vi.fn()

		const result = switchLocaleWithOverride(
			'nb',
			() => undefined,
			setLocaleOverride
		)

		expect(result).toBeUndefined()
		expect(setLocaleOverride).not.toHaveBeenCalled()
	})

	it('forwards requested locale to switch callback', () => {
		const setLocaleOverride = vi.fn()
		const switchLocale = vi.fn(() => undefined)

		switchLocaleWithOverride('nb', switchLocale, setLocaleOverride)

		expect(switchLocale).toHaveBeenCalledWith('nb')
		expect(setLocaleOverride).not.toHaveBeenCalled()
	})

	it('sets override and returns locale when switch succeeds', () => {
		const setLocaleOverride = vi.fn()

		const result = switchLocaleWithOverride('nb', () => 'nb', setLocaleOverride)

		expect(result).toBe('nb')
		expect(setLocaleOverride).toHaveBeenCalledWith('nb')
	})
})

describe('simulateUpdateNotificationAfterEnsure', () => {
	it('ensures notification first, then shows notification', async () => {
		const calls: string[] = []
		const ensureUpdateNotification = vi.fn(async () => {
			calls.push('ensure')
		})
		const showUpdateNotification = vi.fn(() => {
			calls.push('show')
		})

		await simulateUpdateNotificationAfterEnsure(
			ensureUpdateNotification,
			showUpdateNotification
		)

		expect(ensureUpdateNotification).toHaveBeenCalledTimes(1)
		expect(showUpdateNotification).toHaveBeenCalledTimes(1)
		expect(calls).toEqual(['ensure', 'show'])
	})
})
