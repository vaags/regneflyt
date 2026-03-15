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
		delete (globalThis as Record<string, unknown>).document
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

		const { adaptiveSkills } = await import('$lib/stores')

		expect(get(adaptiveSkills)).toEqual([10, 20, 30, 40])
		expect(storage.getItem).toHaveBeenCalledWith(
			'dev.regneflyt.adaptive-profiles.v1'
		)
		expect(storage.setItem).toHaveBeenCalled()
	})

	it('persists updates and reset back to localStorage', async () => {
		const storage = mockWindowWithStorage()
		const { adaptiveSkills } = await import('$lib/stores')

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

		const { overallSkill } = await import('$lib/stores')
		// average = (80+50+60+70)/4 = 65
		expect(get(overallSkill)).toBe(65)
	})

	it('derives overallSkill as 0 when all skills are 0', async () => {
		mockWindowWithStorage()

		const { overallSkill } = await import('$lib/stores')
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
			quiz: { title: 'test', duration: 60, seed: 42 }
		}
		mockWindowWithStorage({
			'dev.regneflyt.last-results.v1': JSON.stringify(stored)
		})

		const { lastResults } = await import('$lib/stores')
		expect(get(lastResults)).toEqual(stored)
	})

	it('defaults lastResults to null when absent', async () => {
		mockWindowWithStorage()

		const { lastResults } = await import('$lib/stores')
		expect(get(lastResults)).toBeNull()
	})

	it('sanitizes malformed lastResults to null', async () => {
		mockWindowWithStorage({
			'dev.regneflyt.last-results.v1': JSON.stringify({ bad: 'data' })
		})

		const { lastResults } = await import('$lib/stores')
		expect(get(lastResults)).toBeNull()
	})

	it('falls back to default on corrupt JSON', async () => {
		mockWindowWithStorage({
			'dev.regneflyt.adaptive-profiles.v1': 'not-json{{'
		})

		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const { overallSkill } = await import('$lib/stores')
		expect(get(overallSkill)).toBe(0)
		expect(warnSpy).toHaveBeenCalled()
		warnSpy.mockRestore()
	})

	it('hydrates lastResults with preQuizSkill from localStorage', async () => {
		const stored = {
			puzzleSet: [{ parts: [], isCorrect: true }],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: { title: 'test', duration: 60, seed: 42 },
			preQuizSkill: [10, 20, 30, 40]
		}
		mockWindowWithStorage({
			'dev.regneflyt.last-results.v1': JSON.stringify(stored)
		})

		const { lastResults } = await import('$lib/stores')
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
			quiz: { title: 'test', duration: 60, seed: 42 }
		}
		mockWindowWithStorage({
			'dev.regneflyt.last-results.v1': JSON.stringify(stored)
		})

		const { lastResults } = await import('$lib/stores')
		const result = get(lastResults)

		expect(result).toBeTruthy()
		expect(result?.preQuizSkill).toBeUndefined()
	})

	it('discards lastResults without seed (pre-replay data)', async () => {
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

		const { lastResults } = await import('$lib/stores')
		expect(get(lastResults)).toBeNull()
	})

	it('uses defaults in SSR (no window)', async () => {
		delete (globalThis as { window?: Window & typeof globalThis }).window

		const { adaptiveSkills, lastResults } = await import('$lib/stores')

		expect(get(adaptiveSkills)).toEqual([0, 0, 0, 0])
		expect(get(lastResults)).toBeNull()
	})

	it('defaults practiceStreak to empty', async () => {
		mockWindowWithStorage({})
		const { practiceStreak } = await import('$lib/stores')
		expect(get(practiceStreak)).toEqual({ lastDate: '', streak: 0 })
	})

	it('hydrates practiceStreak from localStorage', async () => {
		mockWindowWithStorage({
			'dev.regneflyt.practice-streak.v1': JSON.stringify({
				lastDate: '2026-03-13',
				streak: 5
			})
		})
		const { practiceStreak } = await import('$lib/stores')
		expect(get(practiceStreak)).toEqual({ lastDate: '2026-03-13', streak: 5 })
	})

	it('sanitizes invalid practiceStreak to defaults', async () => {
		mockWindowWithStorage({
			'dev.regneflyt.practice-streak.v1': '"bad"'
		})
		const { practiceStreak } = await import('$lib/stores')
		expect(get(practiceStreak)).toEqual({ lastDate: '', streak: 0 })
	})

	it('updatePracticeStreak starts streak at 1 on first use', async () => {
		mockWindowWithStorage({})
		const { practiceStreak, updatePracticeStreak } =
			await import('$lib/stores')
		updatePracticeStreak()
		const result = get(practiceStreak)
		expect(result.streak).toBe(1)
		expect(result.lastDate).toBe(new Date().toLocaleDateString('sv-SE'))
	})

	it('updatePracticeStreak increments streak for consecutive days', async () => {
		const yesterday = new Date(Date.now() - 86_400_000).toLocaleDateString(
			'sv-SE'
		)
		mockWindowWithStorage({
			'dev.regneflyt.practice-streak.v1': JSON.stringify({
				lastDate: yesterday,
				streak: 3
			})
		})
		const { practiceStreak, updatePracticeStreak } =
			await import('$lib/stores')
		updatePracticeStreak()
		const result = get(practiceStreak)
		expect(result.streak).toBe(4)
		expect(result.lastDate).toBe(new Date().toLocaleDateString('sv-SE'))
	})

	it('updatePracticeStreak resets streak after a gap', async () => {
		mockWindowWithStorage({
			'dev.regneflyt.practice-streak.v1': JSON.stringify({
				lastDate: '2026-01-01',
				streak: 10
			})
		})
		const { practiceStreak, updatePracticeStreak } =
			await import('$lib/stores')
		updatePracticeStreak()
		expect(get(practiceStreak).streak).toBe(1)
	})

	it('updatePracticeStreak does nothing if already practiced today', async () => {
		const today = new Date().toLocaleDateString('sv-SE')
		mockWindowWithStorage({
			'dev.regneflyt.practice-streak.v1': JSON.stringify({
				lastDate: today,
				streak: 5
			})
		})
		const { practiceStreak, updatePracticeStreak } =
			await import('$lib/stores')
		updatePracticeStreak()
		expect(get(practiceStreak)).toEqual({ lastDate: today, streak: 5 })
	})

	describe('theme store', () => {
		it('defaults to system when absent', async () => {
			mockWindowWithStorage()
			const { theme } = await import('$lib/stores')
			expect(get(theme)).toBe('system')
		})

		it('hydrates valid theme from localStorage', async () => {
			mockWindowWithStorage({
				'dev.regneflyt.theme.v1': '"dark"'
			})
			const { theme } = await import('$lib/stores')
			expect(get(theme)).toBe('dark')
		})

		it('sanitizes invalid theme to system', async () => {
			mockWindowWithStorage({
				'dev.regneflyt.theme.v1': '"bogus"'
			})
			const { theme } = await import('$lib/stores')
			expect(get(theme)).toBe('system')
		})
	})

	describe('applyTheme', () => {
		it('adds dark class for dark preference', async () => {
			mockWindowWithStorage()
			const classList = new Set<string>()
			;(globalThis as Record<string, unknown>).document = {
				documentElement: {
					classList: {
						toggle: (cls: string, force: boolean) => {
							force ? classList.add(cls) : classList.delete(cls)
						},
						contains: (cls: string) => classList.has(cls)
					}
				},
				cookie: ''
			}
			const { applyTheme } = await import('$lib/stores')

			applyTheme('dark')
			expect(classList.has('dark')).toBe(true)

			applyTheme('light')
			expect(classList.has('dark')).toBe(false)
		})

		it('uses matchMedia for system preference', async () => {
			const mockMatchMedia = vi.fn().mockReturnValue({ matches: false })
			mockWindowWithStorage()
			;(
				globalThis as { window?: Window & typeof globalThis }
			).window!.matchMedia =
				mockMatchMedia as unknown as typeof window.matchMedia

			const classList = new Set<string>()
			;(globalThis as Record<string, unknown>).document = {
				documentElement: {
					classList: {
						toggle: (cls: string, force: boolean) => {
							force ? classList.add(cls) : classList.delete(cls)
						},
						contains: (cls: string) => classList.has(cls)
					}
				},
				cookie: ''
			}
			const { applyTheme } = await import('$lib/stores')

			applyTheme('system')
			expect(classList.has('dark')).toBe(false)
			expect(mockMatchMedia).toHaveBeenCalledWith(
				'(prefers-color-scheme: dark)'
			)
		})
	})

	describe('clearDevStorage', () => {
		it('removes dev-prefixed keys and resets stores', async () => {
			const keys = [
				'dev.regneflyt.theme.v1',
				'dev.regneflyt.adaptive-profiles.v1',
				'other.key'
			]
			let keyIndex = 0
			const removeItem = vi.fn()
			;(globalThis as { window?: Window & typeof globalThis }).window = {
				localStorage: {
					getItem: vi.fn(() => null),
					setItem: vi.fn(),
					removeItem,
					key: vi.fn((i: number) => keys[i] ?? null),
					get length() {
						return keys.length
					},
					clear: vi.fn()
				} as unknown as Storage
			} as unknown as Window & typeof globalThis

			const { clearDevStorage } = await import('$lib/stores')
			clearDevStorage()

			expect(removeItem).toHaveBeenCalledWith('dev.regneflyt.theme.v1')
			expect(removeItem).toHaveBeenCalledWith(
				'dev.regneflyt.adaptive-profiles.v1'
			)
			expect(removeItem).not.toHaveBeenCalledWith('other.key')
		})
	})
})
