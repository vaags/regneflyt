import type { AdaptiveSkillMap } from '../models/AdaptiveProfile'
import { sanitizeAdaptiveSkillMap } from './adaptiveHelper'

// ── Format ──────────────────────────────────────────────────────────
// Byte layout:
//   [0]    version (currently 1)
//   [1–4]  skill values (addition, subtraction, multiplication, division) — 0–100 each
//   [5–6]  totalCorrect  (uint16 big-endian, max 65 535)
//   [7–8]  totalAttempted (uint16 big-endian, max 65 535)
//   [9]    checksum byte
//
// After assembly the payload bytes are XOR-obfuscated with a repeating key,
// then encoded as URL-safe Base64 (no padding).

export type SkillCodeData = {
	skills: AdaptiveSkillMap
	totalCorrect: number
	totalAttempted: number
}

const CODE_VERSION = 1
const PAYLOAD_LENGTH = 10 // 1 version + 4 skills + 2 correct + 2 attempted + 1 checksum

// Obfuscation key — chosen to look "random" while being stable.
// Not cryptographic, just enough to deter casual editing.
const OBF_KEY = [0x5a, 0x93, 0xc7, 0x1e, 0xf4, 0x6b, 0x2d, 0xa8, 0x71, 0x3f]

function computeChecksum(bytes: Uint8Array, end: number): number {
	let ck = 0
	for (let i = 0; i < end; i++) {
		ck = (ck * 31 + bytes[i]!) & 0xff
	}
	return ck
}

function xorObfuscate(bytes: Uint8Array): Uint8Array {
	const out = new Uint8Array(bytes.length)
	for (let i = 0; i < bytes.length; i++) {
		out[i] = bytes[i]! ^ OBF_KEY[i % OBF_KEY.length]!
	}
	return out
}

function toBase64Url(bytes: Uint8Array): string {
	let binary = ''
	for (const b of bytes) binary += String.fromCharCode(b)
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(str: string): Uint8Array | null {
	try {
		// Restore standard Base64
		let b64 = str.replace(/-/g, '+').replace(/_/g, '/')
		const padLen = (4 - (b64.length % 4)) % 4
		b64 += '='.repeat(padLen)

		const binary = atob(b64)
		const bytes = new Uint8Array(binary.length)
		for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
		return bytes
	} catch {
		return null
	}
}

function clampUint16(n: number): number {
	return Math.max(0, Math.min(0xffff, Math.floor(n) || 0))
}

export function encodeSkillCode(data: SkillCodeData): string {
	const buf = new Uint8Array(PAYLOAD_LENGTH)

	buf[0] = CODE_VERSION
	buf[1] = Math.max(0, Math.min(100, Math.round(data.skills[0])))
	buf[2] = Math.max(0, Math.min(100, Math.round(data.skills[1])))
	buf[3] = Math.max(0, Math.min(100, Math.round(data.skills[2])))
	buf[4] = Math.max(0, Math.min(100, Math.round(data.skills[3])))

	const correct = clampUint16(data.totalCorrect)
	buf[5] = (correct >> 8) & 0xff
	buf[6] = correct & 0xff

	const attempted = clampUint16(data.totalAttempted)
	buf[7] = (attempted >> 8) & 0xff
	buf[8] = attempted & 0xff

	buf[9] = computeChecksum(buf, 9)

	return toBase64Url(xorObfuscate(buf))
}

export function decodeSkillCode(code: string): SkillCodeData | null {
	const obfuscated = fromBase64Url(code.trim())
	if (!obfuscated || obfuscated.length !== PAYLOAD_LENGTH) return null

	const buf = xorObfuscate(obfuscated) // XOR is its own inverse

	const expectedChecksum = computeChecksum(buf, 9)
	if (buf[9] !== expectedChecksum) return null

	if (buf[0] !== CODE_VERSION) return null

	const rawSkills = [buf[1], buf[2], buf[3], buf[4]] as AdaptiveSkillMap
	const skills = sanitizeAdaptiveSkillMap(rawSkills)

	const totalCorrect = (buf[5]! << 8) | buf[6]!
	const totalAttempted = (buf[7]! << 8) | buf[8]!

	return { skills, totalCorrect, totalAttempted }
}
