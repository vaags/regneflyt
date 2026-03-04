import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'

type LocalStorageMock = {
	getItem: ReturnType<typeof vi.fn>
	setItem: ReturnType<typeof vi.fn>
}

describe('stores', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.clearAllMocks()
	})

	afterEach(() => {
		delete (globalThis as { window?: Window & typeof globalThis }).window
	})

	function mockWindowWithStorage(values: Record<string, string | null> = {}) {
		const localStorage: LocalStorageMock = {
			getItem: vi.fn((key: string) => values[key] ?? null),
			setItem: vi.fn()
		}

		;(globalThis as { window?: Window & typeof globalThis }).window = {
			localStorage
		} as unknown as Window & typeof globalThis

		return localStorage
	}

	it('hydrates adaptiveProfiles from localStorage when present', async () => {
		const storage = mockWindowWithStorage({
			'regneflyt.adaptive-profiles.v1': JSON.stringify({
				adaptive: [10, 20, 30, 40],
				custom: [1, 2, 3, 4]
			})
		})

		const { adaptiveProfiles } = await import('../../src/stores')

		expect(get(adaptiveProfiles)).toEqual({
			adaptive: [10, 20, 30, 40],
			custom: [1, 2, 3, 4]
		})
		expect(storage.getItem).toHaveBeenCalledWith(
			'regneflyt.adaptive-profiles.v1'
		)
		expect(storage.setItem).toHaveBeenCalled()
	})

	it('persists updates and reset back to localStorage', async () => {
		const storage = mockWindowWithStorage()
		const { adaptiveProfiles } = await import('../../src/stores')

		adaptiveProfiles.update((profiles) => ({
			...profiles,
			adaptive: [5, 6, 7, 8]
		}))

		const updateCall =
			storage.setItem.mock.calls[storage.setItem.mock.calls.length - 1]
		let payload = JSON.parse(updateCall?.[1] as string) as {
			adaptive: number[]
			custom: number[]
		}
		expect(payload.adaptive).toEqual([5, 6, 7, 8])

		adaptiveProfiles.reset()
		const resetCall =
			storage.setItem.mock.calls[storage.setItem.mock.calls.length - 1]
		payload = JSON.parse(resetCall?.[1] as string) as {
			adaptive: number[]
			custom: number[]
		}
		expect(payload).toEqual({
			adaptive: [0, 0, 0, 0],
			custom: [0, 0, 0, 0]
		})
	})

	it('hydrates highscore from localStorage', async () => {
		mockWindowWithStorage({
			'regneflyt.highscore.v1': JSON.stringify(42)
		})

		const { highscore } = await import('../../src/stores')
		expect(get(highscore)).toBe(42)
	})

	it('defaults highscore to 0 when absent', async () => {
		mockWindowWithStorage()

		const { highscore } = await import('../../src/stores')
		expect(get(highscore)).toBe(0)
	})

	it('sanitizes invalid highscore to 0', async () => {
		mockWindowWithStorage({
			'regneflyt.highscore.v1': JSON.stringify('garbage')
		})

		const { highscore } = await import('../../src/stores')
		expect(get(highscore)).toBe(0)
	})

	it('hydrates lastResults from localStorage', async () => {
		const stored = {
			puzzleSet: [{ parts: [], isCorrect: true }],
			quizScores: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				totalScore: 50
			},
			quiz: { title: 'test', duration: 60 }
		}
		mockWindowWithStorage({
			'regneflyt.last-results.v1': JSON.stringify(stored)
		})

		const { lastResults } = await import('../../src/stores')
		expect(get(lastResults)).toEqual(stored)
	})

	it('defaults lastResults to null when absent', async () => {
		mockWindowWithStorage()

		const { lastResults } = await import('../../src/stores')
		expect(get(lastResults)).toBeNull()
	})

	it('sanitizes malformed lastResults to null', async () => {
		mockWindowWithStorage({
			'regneflyt.last-results.v1': JSON.stringify({ bad: 'data' })
		})

		const { lastResults } = await import('../../src/stores')
		expect(get(lastResults)).toBeNull()
	})

	it('falls back to default on corrupt JSON', async () => {
		mockWindowWithStorage({
			'regneflyt.highscore.v1': 'not-json{{'
		})

		const { highscore } = await import('../../src/stores')
		expect(get(highscore)).toBe(0)
	})

	it('uses defaults in SSR (no window)', async () => {
		delete (globalThis as { window?: Window & typeof globalThis }).window

		const { highscore, adaptiveProfiles, lastResults } =
			await import('../../src/stores')

		expect(get(highscore)).toBe(0)
		expect(get(adaptiveProfiles)).toEqual({
			adaptive: [0, 0, 0, 0],
			custom: [0, 0, 0, 0]
		})
		expect(get(lastResults)).toBeNull()
	})
})
