import { describe, expect, it } from 'vitest'
import { contrastRatio } from '../helpers/a11yInvariants'

/**
 * Regression guard for the WCAG AAA boundary that axe-core cannot
 * reliably enforce (6.93:1 rounds to ≥ 7 in some engines).
 * These pin the exact Tailwind stone shades where the palette crosses 7:1.
 */

const stone900 = { r: 28, g: 25, b: 23 }
const stone100 = { r: 245, g: 245, b: 244 }
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

	it('stateful normal text colors pass AAA on panel surfaces (≥ 7:1)', () => {
		expect(
			contrastRatio({ r: 120, g: 53, b: 15 }, stone100)
		).toBeGreaterThanOrEqual(7)
		expect(
			contrastRatio({ r: 153, g: 27, b: 27 }, stone100)
		).toBeGreaterThanOrEqual(7)
		expect(
			contrastRatio({ r: 252, g: 165, b: 165 }, stone900)
		).toBeGreaterThanOrEqual(7)
	})

	it('large incorrect-answer text passes its AAA threshold (≥ 4.5:1)', () => {
		expect(
			contrastRatio({ r: 185, g: 28, b: 28 }, stone100)
		).toBeGreaterThanOrEqual(4.5)
		expect(
			contrastRatio({ r: 248, g: 113, b: 113 }, stone900)
		).toBeGreaterThanOrEqual(4.5)
	})
})
