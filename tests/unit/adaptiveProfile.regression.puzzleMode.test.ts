import { describe, expect, it } from 'vitest'
import { createRng } from '$lib/helpers/rng'
import { PuzzleMode } from '$lib/constants/PuzzleMode'
import { getAdaptivePuzzleMode } from '$lib/helpers/adaptiveHelper'
import { adaptiveTuning } from '$lib/models/AdaptiveProfile'

describe('adaptiveProfile regression: puzzle mode distributions', () => {
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

	it('ramps mode probabilities monotonically around configured midpoints', () => {
		const { alternateMidpoint, randomMidpoint, transitionSpread } =
			adaptiveTuning.puzzleMode
		const halfSpread = transitionSpread / 2

		const alternateBelow = getModeDistribution(alternateMidpoint - halfSpread)
		const alternateAt = getModeDistribution(alternateMidpoint)
		const alternateAbove = getModeDistribution(alternateMidpoint + halfSpread)

		expect(1 - alternateBelow.normal).toBeLessThan(1 - alternateAt.normal)
		expect(1 - alternateAt.normal).toBeLessThan(1 - alternateAbove.normal)

		const randomBelow = getModeDistribution(randomMidpoint - halfSpread)
		const randomAt = getModeDistribution(randomMidpoint)
		const randomAbove = getModeDistribution(randomMidpoint + halfSpread)

		expect(randomBelow.random).toBeLessThan(randomAt.random)
		expect(randomAt.random).toBeLessThan(randomAbove.random)
	})
})
