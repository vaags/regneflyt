import { describe, expect, it } from 'vitest'
import {
	decodeProgressCode,
	encodeProgressCode
} from '$lib/helpers/continueCodeHelper'
import type { AdaptiveSkillMap } from '$lib/models/AdaptiveProfile'

describe('continueCodeHelper', () => {
	describe('round trip', () => {
		it('encodes and decodes back to the same skill map', () => {
			const skills: AdaptiveSkillMap = [12, 45, 78, 100]
			const code = encodeProgressCode(skills)

			expect(decodeProgressCode(code)).toEqual(skills)
		})

		it('round trips all-zero skills', () => {
			const skills: AdaptiveSkillMap = [0, 0, 0, 0]
			expect(decodeProgressCode(encodeProgressCode(skills))).toEqual(skills)
		})

		it('round trips max skills', () => {
			const skills: AdaptiveSkillMap = [100, 100, 100, 100]
			expect(decodeProgressCode(encodeProgressCode(skills))).toEqual(skills)
		})

		it('preserves distinct per-operator values without cross-contamination', () => {
			const skills: AdaptiveSkillMap = [1, 2, 3, 4]
			expect(decodeProgressCode(encodeProgressCode(skills))).toEqual(skills)
		})
	})

	describe('formatting', () => {
		it('formats the code as XXXX-XXX', () => {
			const code = encodeProgressCode([50, 50, 50, 50])
			expect(code).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{3}$/)
		})

		it('decodes regardless of hyphens, spacing, or case', () => {
			const code = encodeProgressCode([33, 66, 10, 90])
			const withoutHyphen = code.replace('-', '')
			const lower = code.toLowerCase()
			const spaced = ` ${code} `

			expect(decodeProgressCode(withoutHyphen)).toEqual([33, 66, 10, 90])
			expect(decodeProgressCode(lower)).toEqual([33, 66, 10, 90])
			expect(decodeProgressCode(spaced)).toEqual([33, 66, 10, 90])
		})

		it('normalizes commonly confused characters (O/0, I,L/1)', () => {
			const code = encodeProgressCode([20, 40, 60, 80])
			const withAmbiguousChars = code.replace(/0/g, 'O').replace(/1/g, 'I')

			expect(decodeProgressCode(withAmbiguousChars)).toEqual([20, 40, 60, 80])
		})
	})

	describe('rejection', () => {
		it('rejects a single mistyped character (checksum mismatch)', () => {
			const code = encodeProgressCode([25, 50, 75, 100])
			const corruptedLastChar =
				code.slice(0, -1) + (code.endsWith('A') ? 'B' : 'A')

			expect(decodeProgressCode(corruptedLastChar)).toBeUndefined()
		})

		it('rejects the wrong length', () => {
			expect(decodeProgressCode('ABCD-EF')).toBeUndefined()
			expect(decodeProgressCode('ABCD-EFGHIJK')).toBeUndefined()
		})

		it('rejects characters outside the alphabet', () => {
			expect(decodeProgressCode('!!!!-!!!')).toBeUndefined()
		})

		it('rejects an empty string', () => {
			expect(decodeProgressCode('')).toBeUndefined()
		})
	})
})
