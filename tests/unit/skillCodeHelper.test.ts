import { describe, expect, it } from 'vitest'
import {
	encodeSkillCode,
	decodeSkillCode,
	type SkillCodeData
} from '../../src/helpers/skillCodeHelper'

describe('skillCodeHelper', () => {
	const sampleData: SkillCodeData = {
		skills: [25, 50, 75, 100],
		totalCorrect: 142,
		totalAttempted: 200
	}

	it('round-trips valid data', () => {
		const code = encodeSkillCode(sampleData)
		const result = decodeSkillCode(code)
		expect(result).toEqual(sampleData)
	})

	it('round-trips all-zero data', () => {
		const data: SkillCodeData = {
			skills: [0, 0, 0, 0],
			totalCorrect: 0,
			totalAttempted: 0
		}
		const code = encodeSkillCode(data)
		const result = decodeSkillCode(code)
		expect(result).toEqual(data)
	})

	it('round-trips max skill values', () => {
		const data: SkillCodeData = {
			skills: [100, 100, 100, 100],
			totalCorrect: 65535,
			totalAttempted: 65535
		}
		const code = encodeSkillCode(data)
		const result = decodeSkillCode(code)
		expect(result).toEqual(data)
	})

	it('produces a short URL-safe string', () => {
		const code = encodeSkillCode(sampleData)
		expect(code.length).toBeLessThanOrEqual(16)
		expect(code).toMatch(/^[A-Za-z0-9_-]+$/)
	})

	it('rejects empty string', () => {
		expect(decodeSkillCode('')).toBeNull()
	})

	it('rejects random gibberish', () => {
		expect(decodeSkillCode('not-a-valid-code!')).toBeNull()
	})

	it('rejects a tampered code (flipped character)', () => {
		const code = encodeSkillCode(sampleData)
		// Flip the first character
		const first = code[0] === 'A' ? 'B' : 'A'
		const tampered = first + code.slice(1)
		expect(decodeSkillCode(tampered)).toBeNull()
	})

	it('rejects a truncated code', () => {
		const code = encodeSkillCode(sampleData)
		expect(decodeSkillCode(code.slice(0, -2))).toBeNull()
	})

	it('handles whitespace around the code', () => {
		const code = encodeSkillCode(sampleData)
		const result = decodeSkillCode('  ' + code + '  ')
		expect(result).toEqual(sampleData)
	})

	it('clamps skill values above 100', () => {
		const data: SkillCodeData = {
			skills: [150, 50, 50, 50],
			totalCorrect: 0,
			totalAttempted: 0
		}
		const code = encodeSkillCode(data)
		const result = decodeSkillCode(code)
		expect(result!.skills[0]).toBe(100)
	})

	it('clamps negative skill values to 0', () => {
		const data: SkillCodeData = {
			skills: [-10, 50, 50, 50],
			totalCorrect: 0,
			totalAttempted: 0
		}
		const code = encodeSkillCode(data)
		const result = decodeSkillCode(code)
		expect(result!.skills[0]).toBe(0)
	})

	it('clamps totalCorrect exceeding uint16 max', () => {
		const data: SkillCodeData = {
			skills: [50, 50, 50, 50],
			totalCorrect: 99999,
			totalAttempted: 99999
		}
		const code = encodeSkillCode(data)
		const result = decodeSkillCode(code)
		expect(result!.totalCorrect).toBe(65535)
		expect(result!.totalAttempted).toBe(65535)
	})

	it('produces different codes for different data', () => {
		const a = encodeSkillCode({
			skills: [10, 20, 30, 40],
			totalCorrect: 5,
			totalAttempted: 10
		})
		const b = encodeSkillCode({
			skills: [40, 30, 20, 10],
			totalCorrect: 5,
			totalAttempted: 10
		})
		expect(a).not.toBe(b)
	})
})
