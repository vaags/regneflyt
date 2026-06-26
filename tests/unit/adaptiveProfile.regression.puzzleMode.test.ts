import { describe, expect, it } from 'vitest'
import { createRng } from '$lib/helpers/rng'
import { PuzzleMode } from '$lib/constants/PuzzleMode'
import { getAdaptivePuzzleMode } from '$lib/helpers/adaptiveHelper'
import { adaptiveTuning } from '$lib/models/AdaptiveProfile'

/**
 * Golden regression tests for puzzle mode distribution at key skill levels.
 * Uses a fixed seed and large sample to assert stable probability bands.
 */
describe('adaptiveProfile golden regressions: puzzle mode', () => {
	const sampleSize = 2000

	function getModeDistribution(
		skill: number,
		seed = 123_456
	): { normal: number; alternate: number; random: number } {
		const { rng } = createRng(seed)
		let normal = 0
		let alternate = 0
		let random = 0

		for (let i = 0; i < sampleSize; i++) {
			const mode = getAdaptivePuzzleMode(rng, skill)
			if (mode === PuzzleMode.Normal) normal++
			else if (mode === PuzzleMode.Alternate) alternate++
			else random++
		}

		return {
			normal: normal / sampleSize,
			alternate: alternate / sampleSize,
			random: random / sampleSize
		}
	}

	it('golden mode distribution at skill 0 (almost all Normal)', () => {
		const dist = getModeDistribution(0)
		expect(dist.normal).toBeGreaterThan(0.95)
		expect(dist.alternate).toBeLessThan(0.05)
		expect(dist.random).toBeLessThan(0.01)
	})

	it('golden mode distribution at alternate midpoint (mix Normal/Alternate)', () => {
		const dist = getModeDistribution(
			adaptiveTuning.puzzleMode.alternateMidpoint
		)
		// At the alternate midpoint, expect ~50% each for Normal vs non-Normal
		expect(dist.normal).toBeGreaterThan(0.35)
		expect(dist.normal).toBeLessThan(0.65)
		expect(dist.alternate).toBeGreaterThan(0.2)
		expect(dist.random).toBeLessThan(0.15)
	})

	it('golden mode distribution at random midpoint (mix Alternate/Random)', () => {
		const dist = getModeDistribution(adaptiveTuning.puzzleMode.randomMidpoint)
		// At the random midpoint
		expect(dist.normal).toBeLessThan(0.1)
		expect(dist.alternate).toBeGreaterThan(0.2)
		expect(dist.random).toBeGreaterThan(0.35)
	})

	it('golden mode distribution at skill 100 (almost all Random)', () => {
		const dist = getModeDistribution(100)
		expect(dist.normal).toBeLessThan(0.02)
		expect(dist.alternate).toBeLessThan(0.15)
		expect(dist.random).toBeGreaterThan(0.85)
	})

	it('golden exact sequence at seed 42 skill 50 remains stable', () => {
		const { rng } = createRng(42)
		const sequence: PuzzleMode[] = []
		for (let i = 0; i < 20; i++) {
			sequence.push(getAdaptivePuzzleMode(rng, 50))
		}
		// Snapshot the exact sequence — any change in sigmoid or rng would break this
		expect(sequence).toMatchSnapshot()
	})

	it('golden exact sequence at seed 9001 skill 75 remains stable', () => {
		const { rng } = createRng(9001)
		const sequence: PuzzleMode[] = []
		for (let i = 0; i < 20; i++) {
			sequence.push(getAdaptivePuzzleMode(rng, 75))
		}
		// Second seed/skill band widens drift detection for the mode sigmoid + rng.
		expect(sequence).toMatchSnapshot()
	})
})
