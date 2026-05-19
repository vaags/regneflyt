import { describe, expect, it } from 'vitest'
import { getRandomUint32Seed } from '$lib/helpers/seedHelper'

describe('seedHelper', () => {
	it('converts deterministic entropy to an unsigned 32-bit seed', () => {
		expect(getRandomUint32Seed(() => 0)).toBe(0)
		expect(getRandomUint32Seed(() => 0.25)).toBe(1073741824)
	})

	it('maps near-1 entropy to the maximum uint32 value', () => {
		const nearOne = 0xffffffff / 0x100000000

		expect(getRandomUint32Seed(() => nearOne)).toBe(0xffffffff)
	})
})
