import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQuiz } from './component-setup'

function get<T>(store: { current: T }): T {
	return store.current
}

type LocalStorageMock = {
	getItem: ReturnType<typeof vi.fn>
	setItem: ReturnType<typeof vi.fn>
}

function setMockWindow(windowValue: { localStorage: unknown }) {
	Object.defineProperty(globalThis, 'window', {
		value: windowValue,
		configurable: true,
		writable: true
	})
}

function setMockDocument(documentValue: {
	documentElement: { classList: unknown }
	cookie: string
	startViewTransition?: unknown
}) {
	Object.defineProperty(globalThis, 'document', {
		value: documentValue,
		configurable: true,
		writable: true
	})
}

function parseNumberArrayFromStorage(value: unknown): number[] {
	const parsed: unknown = JSON.parse(String(value))
	if (!Array.isArray(parsed)) {
		throw new Error('Expected persisted payload to be an array')
	}

	return parsed.map((item) => Number(item))
}

describe('stores', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.clearAllMocks()
	})

	afterEach(() => {
		Reflect.deleteProperty(globalThis, 'window')
		Reflect.deleteProperty(globalThis, 'document')
	})

	function mockWindowWithStorage(values: Record<string, string | null> = {}) {
		const localStorage: LocalStorageMock = {
			getItem: vi.fn((key: string) => values[key] ?? null),
			setItem: vi.fn()
		}

		setMockWindow({ localStorage })

		return localStorage
	}

	function createReplayableQuiz() {
		return createTestQuiz({
			duration: 60,
			difficulty: 1,
			seed: 42,
			operatorSettings: [
				{ operator: 0, range: [1, 10], possibleValues: [] },
				{ operator: 1, range: [1, 10], possibleValues: [] },
				{ operator: 2, range: [0, 0], possibleValues: [2, 3, 4] },
				{ operator: 3, range: [0, 0], possibleValues: [2, 3, 4] }
			]
		})
	}

	function createStoredPuzzle() {
		return {
			parts: [
				{ generatedValue: 4, userDefinedValue: undefined },
				{ generatedValue: 5, userDefinedValue: undefined },
				{ generatedValue: 9, userDefinedValue: 9 }
			],
			duration: 1.2,
			isCorrect: true,
			operator: 0,
			unknownPartIndex: 2
		}
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
		let payload = parseNumberArrayFromStorage(updateCall?.[1])
		expect(payload).toEqual([5, 6, 7, 8])

		adaptiveSkills.reset()
		const resetCall =
			storage.setItem.mock.calls[storage.setItem.mock.calls.length - 1]
		payload = parseNumberArrayFromStorage(resetCall?.[1])
		expect(payload).toEqual([0, 0, 0, 0])
	})

	it('hydrates lastResults from localStorage', async () => {
		const stored = {
			puzzleSet: [createStoredPuzzle()],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: createReplayableQuiz()
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
		const { adaptiveSkills } = await import('$lib/stores')
		expect(get(adaptiveSkills)).toEqual([0, 0, 0, 0])
		expect(warnSpy).toHaveBeenCalled()
		warnSpy.mockRestore()
	})

	it('hydrates lastResults with preQuizSkill from localStorage', async () => {
		const stored = {
			puzzleSet: [createStoredPuzzle()],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: createReplayableQuiz(),
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
			puzzleSet: [createStoredPuzzle()],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: createReplayableQuiz()
		}
		mockWindowWithStorage({
			'dev.regneflyt.last-results.v1': JSON.stringify(stored)
		})

		const { lastResults } = await import('$lib/stores')
		const result = get(lastResults)

		expect(result).toBeTruthy()
		expect(result?.preQuizSkill).toBeUndefined()
	})

	it('discards legacy lastResults with incomplete quiz shape', async () => {
		const stored = {
			puzzleSet: [createStoredPuzzle()],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: { duration: 60, seed: 42 }
		}
		mockWindowWithStorage({
			'dev.regneflyt.last-results.v1': JSON.stringify(stored)
		})

		const { lastResults } = await import('$lib/stores')
		expect(get(lastResults)).toBeNull()
	})

	it('discards lastResults without seed (pre-replay data)', async () => {
		const stored = {
			puzzleSet: [createStoredPuzzle()],
			quizStats: {
				correctAnswerCount: 1,
				correctAnswerPercentage: 100,
				starCount: 1
			},
			quiz: { duration: 60 }
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

	it('keeps dev tools hidden by default', async () => {
		mockWindowWithStorage()
		const { showDevTools } = await import('$lib/stores')
		expect(get(showDevTools)).toBe(false)
	})

	it('toggles dev tools visibility in dev mode only', async () => {
		mockWindowWithStorage()
		const { showDevTools, toggleDevToolsVisibility } =
			await import('$lib/stores')

		const expectedAfterFirstToggle = import.meta.env.DEV
		expect(toggleDevToolsVisibility()).toBe(expectedAfterFirstToggle)
		expect(get(showDevTools)).toBe(expectedAfterFirstToggle)

		expect(toggleDevToolsVisibility()).toBe(false)
		expect(get(showDevTools)).toBe(false)
	})

	it('enables onboarding panel in dev mode only', async () => {
		mockWindowWithStorage({
			'dev.regneflyt.onboarding-completed.v1': 'true'
		})
		const { enableOnboardingPanelForDev, onboardingCompleted } =
			await import('$lib/stores')

		const expectedResult = import.meta.env.DEV
		expect(enableOnboardingPanelForDev()).toBe(expectedResult)
		expect(get(onboardingCompleted)).toBe(false)
	})

	describe('toast notifications', () => {
		it('replaces active toast when a new one is shown', async () => {
			mockWindowWithStorage()
			const { activeToast, showToast, dismissToast } =
				await import('$lib/stores')

			expect(get(activeToast)).toBeUndefined()

			showToast('first')
			const first = get(activeToast)
			expect(first?.message).toBe('first')
			expect(first?.variant).toBe('success')

			showToast('second', { variant: 'error' })
			const second = get(activeToast)
			expect(second?.message).toBe('second')
			expect(second?.variant).toBe('error')

			dismissToast()
			expect(get(activeToast)).toBeUndefined()
		})

		it('preserves custom options when showing a toast', async () => {
			mockWindowWithStorage()
			const { activeToast, showToast, dismissToast } =
				await import('$lib/stores')

			showToast('custom', {
				variant: 'error',
				testId: 'custom-toast',
				autoDismissMs: 1234
			})

			const custom = get(activeToast)
			expect(custom?.message).toBe('custom')
			expect(custom?.variant).toBe('error')
			expect(custom?.testId).toBe('custom-toast')
			expect(custom?.autoDismissMs).toBe(1234)

			dismissToast()
			expect(get(activeToast)).toBeUndefined()
		})
	})

	it('defaults onboardingCompleted to false', async () => {
		mockWindowWithStorage({})
		const { onboardingCompleted } = await import('$lib/stores')
		expect(get(onboardingCompleted)).toBe(false)
	})

	it('hydrates onboardingCompleted from localStorage', async () => {
		mockWindowWithStorage({
			'dev.regneflyt.onboarding-completed.v1': 'true'
		})
		const { onboardingCompleted } = await import('$lib/stores')
		expect(get(onboardingCompleted)).toBe(true)
	})

	it('sanitizes invalid onboardingCompleted values to false', async () => {
		mockWindowWithStorage({
			'dev.regneflyt.onboarding-completed.v1': '"true"'
		})
		const { onboardingCompleted } = await import('$lib/stores')
		expect(get(onboardingCompleted)).toBe(false)
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
		function createMockClassList(initialClasses: string[] = []) {
			const classList = new Set<string>(initialClasses)
			return {
				classList,
				api: {
					toggle: (cls: string, force: boolean) => {
						if (force) {
							classList.add(cls)
						} else {
							classList.delete(cls)
						}
					},
					contains: (cls: string) => classList.has(cls)
				}
			}
		}

		it('adds dark class for dark preference', async () => {
			mockWindowWithStorage()
			const { classList, api } = createMockClassList()
			;(globalThis as Record<string, unknown>).document = {
				documentElement: {
					classList: api
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
			Object.defineProperty(window, 'matchMedia', {
				value: mockMatchMedia,
				configurable: true,
				writable: true
			})

			const { classList, api } = createMockClassList()
			setMockDocument({
				documentElement: {
					classList: api
				},
				cookie: ''
			})
			const { applyTheme } = await import('$lib/stores')

			applyTheme('system')
			expect(classList.has('dark')).toBe(false)
			expect(mockMatchMedia).toHaveBeenCalledWith(
				'(prefers-color-scheme: dark)'
			)
		})

		it('skips transitions when effective theme is unchanged', async () => {
			const startViewTransition = vi.fn()
			mockWindowWithStorage()
			Object.defineProperty(window, 'matchMedia', {
				value: vi.fn().mockImplementation((query: string) => ({
					matches: query === '(prefers-color-scheme: dark)'
				})),
				configurable: true,
				writable: true
			})

			const { classList, api } = createMockClassList(['dark'])
			setMockDocument({
				documentElement: {
					classList: api
				},
				startViewTransition,
				cookie: ''
			})

			const { applyTheme } = await import('$lib/stores')

			applyTheme('dark')

			expect(classList.has('dark')).toBe(true)
			expect(startViewTransition).not.toHaveBeenCalled()
			expect(classList.has('theme-transitioning')).toBe(false)
		})

		it('bypasses view transitions when reduced motion is enabled', async () => {
			const startViewTransition = vi.fn()
			mockWindowWithStorage()
			Object.defineProperty(window, 'matchMedia', {
				value: vi.fn().mockImplementation((query: string) => ({
					matches: query === '(prefers-reduced-motion: reduce)'
				})),
				configurable: true,
				writable: true
			})

			const { classList, api } = createMockClassList([
				'dark',
				'theme-transitioning'
			])
			setMockDocument({
				documentElement: {
					classList: api
				},
				startViewTransition,
				cookie: ''
			})

			const { applyTheme } = await import('$lib/stores')

			applyTheme('light')

			expect(classList.has('dark')).toBe(false)
			expect(classList.has('theme-transitioning')).toBe(false)
			expect(startViewTransition).not.toHaveBeenCalled()
		})

		it('keeps transition class until latest transition finishes', async () => {
			const finishResolvers: Array<() => void> = []
			const startViewTransition = vi.fn((updateCallback: () => void) => {
				updateCallback()
				return {
					finished: new Promise<void>((resolve) => {
						finishResolvers.push(resolve)
					})
				}
			})

			mockWindowWithStorage()
			Object.defineProperty(window, 'matchMedia', {
				value: vi.fn().mockReturnValue({ matches: false }),
				configurable: true,
				writable: true
			})

			const { classList, api } = createMockClassList(['dark'])
			setMockDocument({
				documentElement: {
					classList: api
				},
				startViewTransition,
				cookie: ''
			})

			const { applyTheme } = await import('$lib/stores')

			applyTheme('light')
			applyTheme('dark')

			expect(startViewTransition).toHaveBeenCalledTimes(2)
			expect(classList.has('theme-transitioning')).toBe(true)

			finishResolvers[0]?.()
			await Promise.resolve()
			await Promise.resolve()
			expect(classList.has('theme-transitioning')).toBe(true)

			finishResolvers[1]?.()
			await Promise.resolve()
			await Promise.resolve()
			expect(classList.has('theme-transitioning')).toBe(false)
		})

		it('applies theme when startViewTransition throws', async () => {
			mockWindowWithStorage()
			Object.defineProperty(window, 'matchMedia', {
				value: vi.fn().mockReturnValue({ matches: false }),
				configurable: true,
				writable: true
			})

			const startViewTransition = vi.fn(() => {
				throw new Error('transition failed')
			})

			const { classList, api } = createMockClassList([
				'dark',
				'theme-transitioning'
			])
			setMockDocument({
				documentElement: {
					classList: api
				},
				startViewTransition,
				cookie: ''
			})

			const { applyTheme } = await import('$lib/stores')

			applyTheme('light')

			expect(startViewTransition).toHaveBeenCalledTimes(1)
			expect(classList.has('dark')).toBe(false)
			expect(classList.has('theme-transitioning')).toBe(false)
		})
	})

	describe('clearAllProgress', () => {
		it('removes dev-prefixed keys and resets stores', async () => {
			const keys = [
				'dev.regneflyt.theme.v1',
				'dev.regneflyt.adaptive-profiles.v1',
				'dev.regneflyt.onboarding-completed.v1',
				'other.key'
			]
			const removeItem = vi.fn()
			setMockWindow({
				localStorage: {
					getItem: vi.fn((key: string) =>
						key === 'dev.regneflyt.onboarding-completed.v1' ? 'true' : null
					),
					setItem: vi.fn(),
					removeItem,
					key: vi.fn((i: number) => keys[i] ?? null),
					get length() {
						return keys.length
					},
					clear: vi.fn()
				}
			})

			const { clearAllProgress, onboardingCompleted } =
				await import('$lib/stores')
			expect(get(onboardingCompleted)).toBe(true)
			clearAllProgress()

			expect(removeItem).toHaveBeenCalledWith('dev.regneflyt.theme.v1')
			expect(removeItem).toHaveBeenCalledWith(
				'dev.regneflyt.adaptive-profiles.v1'
			)
			expect(removeItem).toHaveBeenCalledWith(
				'dev.regneflyt.onboarding-completed.v1'
			)
			expect(removeItem).not.toHaveBeenCalledWith('other.key')
			expect(get(onboardingCompleted)).toBe(false)
		})
	})
})
