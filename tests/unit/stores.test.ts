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

	it('hydrates adaptiveSkills from localStorage when present', async () => {
		const storage = mockWindowWithStorage({
			'dev.regneflyt.adaptive-profiles.v1': JSON.stringify([10, 20, 30, 40])
		})

		const { adaptiveSkills } = await import('../../src/stores')

		expect(get(adaptiveSkills)).toEqual([10, 20, 30, 40])
		expect(storage.getItem).toHaveBeenCalledWith(
			'dev.regneflyt.adaptive-profiles.v1'
		)
		expect(storage.setItem).toHaveBeenCalled()
	})

	it('persists updates and reset back to localStorage', async () => {
		const storage = mockWindowWithStorage()
		const { adaptiveSkills } = await import('../../src/stores')

		adaptiveSkills.set([5, 6, 7, 8])

		const updateCall =
			storage.setItem.mock.calls[storage.setItem.mock.calls.length - 1]
		let payload = JSON.parse(updateCall?.[1] as string) as number[]
		expect(payload).toEqual([5, 6, 7, 8])

		adaptiveSkills.reset()
		const resetCall =
			storage.setItem.mock.calls[storage.setItem.mock.calls.length - 1]
		payload = JSON.parse(resetCall?.[1] as string) as number[]
		expect(payload).toEqual([0, 0, 0, 0])
	})

	it('derives overallSkill as average of skill values', async () => {
		mockWindowWithStorage({
			'dev.regneflyt.adaptive-profiles.v1': JSON.stringify([80, 50, 60, 70])
		})

		const { overallSkill } = await import('../../src/stores')
		// average = (80+50+60+70)/4 = 65
		expect(get(overallSkill)).toBe(65)
	})

	it('derives overallSkill as 0 when all skills are 0', async () => {
		mockWindowWithStorage()

		const { overallSkill } = await import('../../src/stores')
		expect(get(overallSkill)).toBe(0)
	})

	it('hydrates lastResults from localStorage', async () => {
		const stored = {
			puzzleSet: [{ parts: [], isCorrect: true }],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: { title: 'test', duration: 60 }
		}
		mockWindowWithStorage({
			'dev.regneflyt.last-results.v1': JSON.stringify(stored)
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
			'dev.regneflyt.last-results.v1': JSON.stringify({ bad: 'data' })
		})

		const { lastResults } = await import('../../src/stores')
		expect(get(lastResults)).toBeNull()
	})

	it('falls back to default on corrupt JSON', async () => {
		mockWindowWithStorage({
			'dev.regneflyt.adaptive-profiles.v1': 'not-json{{'
		})

		const { overallSkill } = await import('../../src/stores')
		expect(get(overallSkill)).toBe(0)
	})

	it('hydrates lastResults with preQuizSkill from localStorage', async () => {
		const stored = {
			puzzleSet: [{ parts: [], isCorrect: true }],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: { title: 'test', duration: 60 },
			preQuizSkill: [10, 20, 30, 40]
		}
		mockWindowWithStorage({
			'dev.regneflyt.last-results.v1': JSON.stringify(stored)
		})

		const { lastResults } = await import('../../src/stores')
		const result = get(lastResults)

		expect(result?.preQuizSkill).toEqual([10, 20, 30, 40])
	})

	it('hydrates lastResults without preQuizSkill (backward compat)', async () => {
		const stored = {
			puzzleSet: [{ parts: [], isCorrect: true }],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: { title: 'test', duration: 60 }
		}
		mockWindowWithStorage({
			'dev.regneflyt.last-results.v1': JSON.stringify(stored)
		})

		const { lastResults } = await import('../../src/stores')
		const result = get(lastResults)

		expect(result).toBeTruthy()
		expect(result?.preQuizSkill).toBeUndefined()
	})

	it('uses defaults in SSR (no window)', async () => {
		delete (globalThis as { window?: Window & typeof globalThis }).window

		const { adaptiveSkills, lastResults, totalCorrect, totalAttempted } =
			await import('../../src/stores')

		expect(get(adaptiveSkills)).toEqual([0, 0, 0, 0])
		expect(get(lastResults)).toBeNull()
		expect(get(totalCorrect)).toBe(0)
		expect(get(totalAttempted)).toBe(0)
	})

	it('hydrates totalCorrect and totalAttempted from localStorage', async () => {
		mockWindowWithStorage({
			'dev.regneflyt.total-correct.v1': '42',
			'dev.regneflyt.total-attempted.v1': '100'
		})

		const { totalCorrect, totalAttempted } = await import('../../src/stores')
		expect(get(totalCorrect)).toBe(42)
		expect(get(totalAttempted)).toBe(100)
	})

	it('sanitizes negative totalCorrect to 0', async () => {
		mockWindowWithStorage({
			'dev.regneflyt.total-correct.v1': '-5'
		})

		const { totalCorrect } = await import('../../src/stores')
		expect(get(totalCorrect)).toBe(0)
	})

	it('sanitizes non-numeric totalAttempted to 0', async () => {
		mockWindowWithStorage({
			'dev.regneflyt.total-attempted.v1': '"abc"'
		})

		const { totalAttempted } = await import('../../src/stores')
		expect(get(totalAttempted)).toBe(0)
	})

	it('floors fractional counter values', async () => {
		mockWindowWithStorage({
			'dev.regneflyt.total-correct.v1': '7.9'
		})

		const { totalCorrect } = await import('../../src/stores')
		expect(get(totalCorrect)).toBe(7)
	})
})
