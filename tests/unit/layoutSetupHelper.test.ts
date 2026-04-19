import { describe, expect, it, vi } from 'vitest'
import {
	setupLayoutMountSync,
	setupLayoutMountDocument,
	handleDevToolsShortcut,
	handleOnboardingShortcut,
	isDevToolsShortcut,
	isOnboardingShortcut
} from '$lib/helpers/layout/layoutSetupHelper'
import type { ThemePreference } from '$lib/stores'

describe('setupLayoutSetupHelper', () => {
	describe('keyboard shortcuts', () => {
		function createEvent(
			overrides: Partial<KeyboardEvent> = {}
		): Pick<
			KeyboardEvent,
			| 'defaultPrevented'
			| 'repeat'
			| 'metaKey'
			| 'ctrlKey'
			| 'shiftKey'
			| 'key'
			| 'preventDefault'
		> {
			return {
				defaultPrevented: false,
				repeat: false,
				metaKey: false,
				ctrlKey: false,
				shiftKey: false,
				key: '',
				preventDefault: vi.fn(),
				...overrides
			}
		}

		describe('isDevToolsShortcut', () => {
			it('detects Cmd+Shift+D on macOS', () => {
				const event = createEvent({
					metaKey: true,
					shiftKey: true,
					key: 'd'
				})
				expect(isDevToolsShortcut(event)).toBe(true)
			})

			it('detects Ctrl+Shift+D on Windows/Linux', () => {
				const event = createEvent({
					ctrlKey: true,
					shiftKey: true,
					key: 'D'
				})
				expect(isDevToolsShortcut(event)).toBe(true)
			})

			it('returns false when shift is missing', () => {
				const event = createEvent({
					metaKey: true,
					key: 'd'
				})
				expect(isDevToolsShortcut(event)).toBe(false)
			})

			it('returns false when cmd/ctrl is missing', () => {
				const event = createEvent({
					shiftKey: true,
					key: 'd'
				})
				expect(isDevToolsShortcut(event)).toBe(false)
			})

			it('returns false when key is not "d"', () => {
				const event = createEvent({
					metaKey: true,
					shiftKey: true,
					key: 'e'
				})
				expect(isDevToolsShortcut(event)).toBe(false)
			})
		})

		describe('isOnboardingShortcut', () => {
			it('detects Cmd+Shift+O on macOS', () => {
				const event = createEvent({
					metaKey: true,
					shiftKey: true,
					key: 'o'
				})
				expect(isOnboardingShortcut(event)).toBe(true)
			})

			it('detects Ctrl+Shift+O on Windows/Linux', () => {
				const event = createEvent({
					ctrlKey: true,
					shiftKey: true,
					key: 'O'
				})
				expect(isOnboardingShortcut(event)).toBe(true)
			})

			it('returns false when shift is missing', () => {
				const event = createEvent({
					metaKey: true,
					key: 'o'
				})
				expect(isOnboardingShortcut(event)).toBe(false)
			})
		})

		describe('handleDevToolsShortcut', () => {
			it('prevents default and calls toggle in development', () => {
				const preventDefault = vi.fn()
				const toggle = vi.fn()
				const event = createEvent({
					metaKey: true,
					shiftKey: true,
					key: 'd',
					preventDefault
				})

				const handled = handleDevToolsShortcut(event, false, toggle)

				expect(handled).toBe(true)
				expect(preventDefault).toHaveBeenCalled()
				expect(toggle).toHaveBeenCalled()
			})

			it('does not handle in production', () => {
				const toggle = vi.fn()
				const event = createEvent({
					metaKey: true,
					shiftKey: true,
					key: 'd'
				})

				const handled = handleDevToolsShortcut(event, true, toggle)

				expect(handled).toBe(false)
				expect(toggle).not.toHaveBeenCalled()
			})

			it('does not handle when already prevented', () => {
				const toggle = vi.fn()
				const event = createEvent({
					metaKey: true,
					shiftKey: true,
					key: 'd',
					defaultPrevented: true
				})

				const handled = handleDevToolsShortcut(event, false, toggle)

				expect(handled).toBe(false)
				expect(toggle).not.toHaveBeenCalled()
			})

			it('does not handle repeated key events', () => {
				const toggle = vi.fn()
				const event = createEvent({
					metaKey: true,
					shiftKey: true,
					key: 'd',
					repeat: true
				})

				const handled = handleDevToolsShortcut(event, false, toggle)

				expect(handled).toBe(false)
				expect(toggle).not.toHaveBeenCalled()
			})
		})

		describe('handleOnboardingShortcut', () => {
			it('prevents default and calls show in development', () => {
				const preventDefault = vi.fn()
				const show = vi.fn()
				const event = createEvent({
					metaKey: true,
					shiftKey: true,
					key: 'o',
					preventDefault
				})

				const handled = handleOnboardingShortcut(event, false, show)

				expect(handled).toBe(true)
				expect(preventDefault).toHaveBeenCalled()
				expect(show).toHaveBeenCalled()
			})

			it('does not handle in production', () => {
				const show = vi.fn()
				const event = createEvent({
					metaKey: true,
					shiftKey: true,
					key: 'o'
				})

				const handled = handleOnboardingShortcut(event, true, show)

				expect(handled).toBe(false)
				expect(show).not.toHaveBeenCalled()
			})
		})
	})

	describe('mount document setup', () => {
		it('clears initial-load class after two animation frames', () => {
			const classList = { remove: vi.fn() }
			const style = { setProperty: vi.fn() }
			const documentTarget = {
				body: { classList },
				documentElement: { style }
			} satisfies Parameters<typeof setupLayoutMountDocument>[0]
			const frames: Array<() => void> = []
			const requestAnimationFrameFn = vi.fn((cb: () => void) => {
				frames.push(cb)
			})

			setupLayoutMountDocument(
				documentTarget,
				requestAnimationFrameFn,
				200,
				300,
				'initial-load'
			)

			// First call is immediate
			expect(requestAnimationFrameFn).toHaveBeenCalledTimes(1)
			expect(classList.remove).not.toHaveBeenCalled()

			// First frame callback schedules second frame
			const firstFrame = frames[0]
			if (firstFrame) {
				firstFrame()
			}
			expect(requestAnimationFrameFn).toHaveBeenCalledTimes(2)

			// Second frame callback removes class
			const secondFrame = frames[1]
			if (secondFrame) {
				secondFrame()
			}
			expect(classList.remove).toHaveBeenCalledWith('initial-load')
		})

		it('sets CSS variables for transitions', () => {
			const classList = { remove: vi.fn() }
			const style = { setProperty: vi.fn() }
			const documentTarget = {
				body: { classList },
				documentElement: { style }
			} satisfies Parameters<typeof setupLayoutMountDocument>[0]
			const requestAnimationFrameFn = vi.fn()

			setupLayoutMountDocument(
				documentTarget,
				requestAnimationFrameFn,
				250,
				350
			)

			expect(style.setProperty).toHaveBeenCalledWith(
				'--theme-transition-ms',
				'250ms'
			)
			expect(style.setProperty).toHaveBeenCalledWith(
				'--page-transition-ms',
				'350ms'
			)
		})
	})

	describe('mount sync setup', () => {
		it('syncs search from location on init', () => {
			const listeners = new Map<string, EventListener>()
			const windowTarget = {
				location: { search: '?difficulty=1' },
				matchMedia: () => ({
					addEventListener: vi.fn(),
					removeEventListener: vi.fn()
				}),
				addEventListener: (type: string, listener: EventListener) => {
					listeners.set(type, listener)
				},
				removeEventListener: vi.fn()
			} satisfies Parameters<typeof setupLayoutMountSync>[0]
			const setCurrentSearch = vi.fn()

			setupLayoutMountSync(
				windowTarget,
				'quiz-query-updated',
				() => 'light' as ThemePreference,
				setCurrentSearch,
				() => {}
			)

			expect(setCurrentSearch).toHaveBeenCalledWith('?difficulty=1')
		})

		it('returns cleanup function that removes listeners', () => {
			const listeners = new Map<string, EventListener>()
			const windowTarget = {
				location: { search: '' },
				matchMedia: () => ({
					addEventListener: vi.fn(),
					removeEventListener: vi.fn()
				}),
				addEventListener: (type: string, listener: EventListener) => {
					listeners.set(type, listener)
				},
				removeEventListener: vi.fn()
			} satisfies Parameters<typeof setupLayoutMountSync>[0]

			const cleanup = setupLayoutMountSync(
				windowTarget,
				'quiz-query-updated',
				() => 'light' as ThemePreference,
				() => {},
				() => {}
			)

			expect(typeof cleanup).toBe('function')
		})
	})
})
