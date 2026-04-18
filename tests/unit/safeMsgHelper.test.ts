import { describe, expect, it } from 'vitest'
import { safeMsg } from '$lib/helpers/safeMsgHelper'

describe('safeMsg', () => {
	it('returns function result when no error is thrown', () => {
		expect(safeMsg(() => 'ok', 'fallback')).toBe('ok')
	})

	it('returns fallback when function throws', () => {
		expect(
			safeMsg(() => {
				throw new Error('boom')
			}, 'fallback')
		).toBe('fallback')
	})
})
