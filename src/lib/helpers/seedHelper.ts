const UINT32_MODULO = 0x100000000

/**
 * Converts entropy into an unsigned 32-bit seed.
 * Default entropy source is Math.random when no provider is injected.
 */
export function getRandomUint32Seed(
	random: () => number = Math.random
): number {
	return (random() * UINT32_MODULO) >>> 0
}
