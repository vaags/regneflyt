import { describe, expect, it } from 'vitest'
import { resolveE2eServerMode } from '../e2e/e2eServerMode'

describe('resolveE2eServerMode', () => {
	it('uses development locally when no mode is configured', () => {
		expect(resolveE2eServerMode(undefined, false)).toBe('development')
	})

	it('uses production in CI when no mode is configured', () => {
		expect(resolveE2eServerMode(undefined, true)).toBe('production')
	})

	it.each(['development', 'production', 'preview'] as const)(
		'uses explicitly configured %s mode',
		(mode) => {
			expect(resolveE2eServerMode(mode, false)).toBe(mode)
		}
	)

	it('rejects unsupported modes', () => {
		expect(() => resolveE2eServerMode('invalid', false)).toThrow(
			'Unsupported E2E_SERVER_MODE "invalid". Use development, production, or preview.'
		)
	})
})
