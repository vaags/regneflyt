import { describe, expect, it } from 'vitest'
import { contrastRatio } from '../helpers/a11yInvariants'

/**
 * Regression guard for the WCAG AAA boundary that axe-core cannot
 * reliably enforce (6.93:1 rounds to ≥ 7 in some engines).
 * These pin the exact Tailwind stone shades where the palette crosses 7:1.
 */

const stone900 = { r: 28, g: 25, b: 23 }
const white = { r: 255, g: 255, b: 255 }

describe('WCAG AAA contrast boundaries', () => {
	it('dark: stone-400 on stone-900 fails AAA (< 7:1)', () => {
		expect(contrastRatio({ r: 168, g: 162, b: 158 }, stone900)).toBeLessThan(7)
	})

	it('dark: stone-300 on stone-900 passes AAA (≥ 7:1)', () => {
		expect(
			contrastRatio({ r: 214, g: 211, b: 209 }, stone900)
		).toBeGreaterThanOrEqual(7)
	})

	it('light: stone-500 on white fails AAA (< 7:1)', () => {
		expect(contrastRatio({ r: 120, g: 113, b: 108 }, white)).toBeLessThan(7)
	})

	it('light: stone-600 on white passes AAA (≥ 7:1)', () => {
		expect(
			contrastRatio({ r: 87, g: 83, b: 78 }, white)
		).toBeGreaterThanOrEqual(7)
	})
})
