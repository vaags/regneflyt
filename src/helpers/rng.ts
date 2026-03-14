import { xoroshiro128plus } from 'pure-rand/generator/xoroshiro128plus'
import { uniformInt } from 'pure-rand/distribution/uniformInt'
import type { RandomGenerator } from 'pure-rand/types/RandomGenerator'

export type Rng = RandomGenerator

/** Create a seeded RNG. Omit `seed` for a random seed based on `Math.random()`. */
export function createRng(seed?: number): { rng: Rng; seed: number } {
	const resolvedSeed = seed ?? (Math.random() * 0x100000000) >>> 0
	return { rng: xoroshiro128plus(resolvedSeed), seed: resolvedSeed }
}

/** Random integer in [min, max] (inclusive). Mutates the generator. */
export function nextInt(rng: Rng, min: number, max: number): number {
	return uniformInt(rng, min, max)
}

/** Random float in [0, 1). Mutates the generator. */
export function nextFloat(rng: Rng): number {
	return uniformInt(rng, 0, 0x7fffffff) / (0x7fffffff + 1)
}

/** Random boolean (50/50). Mutates the generator. */
export function nextBool(rng: Rng): boolean {
	return uniformInt(rng, 0, 1) === 1
}
