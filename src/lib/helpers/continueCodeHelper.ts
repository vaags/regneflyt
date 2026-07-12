import { clampSkill } from '$lib/helpers/adaptiveSkillUpdate'
import type { AdaptiveSkillMap } from '$lib/models/AdaptiveProfile'

// Encodes the four adaptive skill values into a short, human-typable "progress
// code" and back. Purely local: the code is a portable snapshot of already-
// visible progress data, not a credential, so there are no entropy/hashing/
// rate-limit concerns here — only typo detection via the checksum.
//
// Layout (35 bits total, packed MSB-first): addition(7) | subtraction(7) |
// multiplication(7) | division(7) | version(3) | checksum(4).
// 35 bits / 5 bits-per-char = 7 Crockford Base32 characters, displayed as
// "XXXX-XXX".
const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const BITS_PER_SKILL = 7
const SKILL_MASK = 0x7fn // 7 bits
const SKILL_COUNT = 4
const VERSION_BITS = 3n
const VERSION_MASK = 0x7n // 3 bits
const CHECKSUM_BITS = 4n
const CHECKSUM_MASK = 0xfn // 4 bits
const CHAR_COUNT = (SKILL_COUNT * BITS_PER_SKILL + 3 + 4) / 5 // 7
const CURRENT_VERSION = 1n

// Simple weighted digit sum over 5-bit chunks of the payload. Not
// cryptographic — it only needs to make an accidental single-character typo
// very likely (not certain) to be caught, which a 4-bit checksum comfortably
// does for this use case.
function computeChecksum(payload: bigint): bigint {
	const weights = [1n, 3n, 5n, 7n, 11n, 13n, 17n]
	let sum = 0n
	let remaining = payload
	let weightIndex = 0
	while (remaining > 0n) {
		sum += (remaining & 0x1fn) * (weights[weightIndex % weights.length] ?? 1n)
		remaining >>= 5n
		weightIndex++
	}
	return sum & CHECKSUM_MASK
}

function normalizeInput(code: string): string {
	return code
		.trim()
		.toUpperCase()
		.replace(/[\s-]/g, '')
		.replace(/O/g, '0')
		.replace(/[IL]/g, '1')
}

/**
 * Encodes the current adaptive skill map into a short, copyable progress
 * code, formatted "XXXX-XXX" for readability.
 */
export function encodeProgressCode(skills: AdaptiveSkillMap): string {
	let payload = 0n
	for (const skill of skills) {
		payload = (payload << BigInt(BITS_PER_SKILL)) | BigInt(clampSkill(skill))
	}
	payload = (payload << VERSION_BITS) | CURRENT_VERSION

	const full = (payload << CHECKSUM_BITS) | computeChecksum(payload)

	let chars = ''
	let remaining = full
	for (let i = 0; i < CHAR_COUNT; i++) {
		chars = CROCKFORD_ALPHABET[Number(remaining & 0x1fn)] + chars
		remaining >>= 5n
	}

	return `${chars.slice(0, 4)}-${chars.slice(4)}`
}

/**
 * Decodes a progress code back into an adaptive skill map. Returns
 * `undefined` for malformed input, an unrecognized format version, or a
 * checksum mismatch (most likely a typo) — never a guessed/garbage value.
 */
export function decodeProgressCode(code: string): AdaptiveSkillMap | undefined {
	const normalized = normalizeInput(code)
	if (normalized.length !== CHAR_COUNT) return undefined

	let full = 0n
	for (const char of normalized) {
		const index = CROCKFORD_ALPHABET.indexOf(char)
		if (index === -1) return undefined
		full = (full << 5n) | BigInt(index)
	}

	const checksum = full & CHECKSUM_MASK
	const payload = full >> CHECKSUM_BITS
	if (computeChecksum(payload) !== checksum) return undefined

	const version = payload & VERSION_MASK
	if (version !== CURRENT_VERSION) return undefined

	let remaining = payload >> VERSION_BITS
	const skills: number[] = []
	for (let i = 0; i < SKILL_COUNT; i++) {
		skills.unshift(Number(remaining & SKILL_MASK))
		remaining >>= BigInt(BITS_PER_SKILL)
	}

	if (skills.some((value) => value < 0 || value > 100)) return undefined

	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- exactly 4 skills guaranteed by the fixed loop above
	return skills.map((value) => clampSkill(value)) as AdaptiveSkillMap
}
