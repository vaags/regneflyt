import { describe, expect, it, vi } from 'vitest'
import {
	handleDevToolsShortcut,
	handleOnboardingShortcut,
	isDevToolsShortcut,
	isOnboardingShortcut,
	createDevTapState,
	handleDevTap
} from '$lib/helpers/layout/layoutSetupHelper'

type MockKeyboardEvent = KeyboardEvent & {
	preventDefault: ReturnType<typeof vi.fn>
}

function createEvent(
	overrides: Partial<KeyboardEvent> = {}
): MockKeyboardEvent {
	return {
		defaultPrevented: false,
		repeat: false,
		metaKey: false,
		ctrlKey: false,
		shiftKey: false,
		key: '',
		preventDefault: vi.fn(),
		...overrides
	} as unknown as MockKeyboardEvent
}

describe('isDevToolsShortcut', () => {
	it('matches cmd/ctrl + shift + d', () => {
		expect(
			isDevToolsShortcut(
				createEvent({ metaKey: true, shiftKey: true, key: 'd' })
			)
		).toBe(true)
		expect(
			isDevToolsShortcut(
				createEvent({ ctrlKey: true, shiftKey: true, key: 'D' })
			)
		).toBe(true)
	})

	it('returns false for other key combinations', () => {
		expect(
			isDevToolsShortcut(
				createEvent({ metaKey: true, shiftKey: true, key: 'k' })
			)
		).toBe(false)
		expect(
			isDevToolsShortcut(
				createEvent({ metaKey: true, shiftKey: false, key: 'd' })
			)
		).toBe(false)
	})
})

describe('isOnboardingShortcut', () => {
	it('matches cmd/ctrl + shift + o', () => {
		expect(
			isOnboardingShortcut(
				createEvent({ metaKey: true, shiftKey: true, key: 'o' })
			)
		).toBe(true)
		expect(
			isOnboardingShortcut(
				createEvent({ ctrlKey: true, shiftKey: true, key: 'O' })
			)
		).toBe(true)
	})

	it('returns false for other key combinations', () => {
		expect(
			isOnboardingShortcut(
				createEvent({ metaKey: true, shiftKey: true, key: 'd' })
			)
		).toBe(false)
		expect(
			isOnboardingShortcut(
				createEvent({ metaKey: true, shiftKey: false, key: 'o' })
			)
		).toBe(false)
	})
})

describe('handleDevToolsShortcut', () => {
	it('ignores prevented/repeat events', () => {
		const toggle = vi.fn()
		const prevented = createEvent({
			defaultPrevented: true,
			metaKey: true,
			shiftKey: true,
			key: 'd'
		})
		const repeated = createEvent({
			repeat: true,
			metaKey: true,
			shiftKey: true,
			key: 'd'
		})

		expect(handleDevToolsShortcut(prevented, toggle)).toBe(false)
		expect(handleDevToolsShortcut(repeated, toggle)).toBe(false)
		expect(toggle).not.toHaveBeenCalled()
	})

	it('prevents default and toggles for matching shortcut', () => {
		const event = createEvent({ metaKey: true, shiftKey: true, key: 'd' })
		const toggle = vi.fn()

		expect(handleDevToolsShortcut(event, toggle)).toBe(true)
		expect(event.preventDefault).toHaveBeenCalledTimes(1)
		expect(toggle).toHaveBeenCalledTimes(1)
	})
})

describe('handleOnboardingShortcut', () => {
	it('ignores shortcut in production', () => {
		const event = createEvent({ metaKey: true, shiftKey: true, key: 'o' })
		const show = vi.fn()

		expect(handleOnboardingShortcut(event, true, show)).toBe(false)
		expect(show).not.toHaveBeenCalled()
		expect(event.preventDefault).not.toHaveBeenCalled()
	})

	it('ignores prevented/repeat events', () => {
		const show = vi.fn()
		const prevented = createEvent({
			defaultPrevented: true,
			metaKey: true,
			shiftKey: true,
			key: 'o'
		})
		const repeated = createEvent({
			repeat: true,
			metaKey: true,
			shiftKey: true,
			key: 'o'
		})

		expect(handleOnboardingShortcut(prevented, false, show)).toBe(false)
		expect(handleOnboardingShortcut(repeated, false, show)).toBe(false)
		expect(show).not.toHaveBeenCalled()
	})

	it('prevents default and shows onboarding for matching shortcut', () => {
		const event = createEvent({ metaKey: true, shiftKey: true, key: 'o' })
		const show = vi.fn()

		expect(handleOnboardingShortcut(event, false, show)).toBe(true)
		expect(event.preventDefault).toHaveBeenCalledTimes(1)
		expect(show).toHaveBeenCalledTimes(1)
	})
})

describe('handleDevTap', () => {
	it('does not toggle before reaching 7 taps', () => {
		const state = createDevTapState()
		const toggle = vi.fn()

		for (let i = 0; i < 6; i++) {
			expect(handleDevTap(state, 1000 + i * 100, toggle)).toBe(false)
		}
		expect(toggle).not.toHaveBeenCalled()
	})

	it('toggles on the 7th tap within the time window', () => {
		const state = createDevTapState()
		const toggle = vi.fn()

		for (let i = 0; i < 6; i++) {
			handleDevTap(state, 1000 + i * 100, toggle)
		}
		expect(handleDevTap(state, 1000 + 600, toggle)).toBe(true)
		expect(toggle).toHaveBeenCalledTimes(1)
	})

	it('resets count when taps exceed the 3-second window', () => {
		const state = createDevTapState()
		const toggle = vi.fn()

		for (let i = 0; i < 5; i++) {
			handleDevTap(state, 1000 + i * 100, toggle)
		}
		// 6th tap is too late — resets the window
		handleDevTap(state, 5000, toggle)
		expect(state.count).toBe(1)

		// Need another full sequence to trigger
		for (let i = 1; i < 7; i++) {
			handleDevTap(state, 5000 + i * 100, toggle)
		}
		expect(toggle).toHaveBeenCalledTimes(1)
	})

	it('resets state after successful toggle', () => {
		const state = createDevTapState()
		const toggle = vi.fn()

		for (let i = 0; i < 7; i++) {
			handleDevTap(state, 1000 + i * 100, toggle)
		}
		expect(state.count).toBe(0)
		expect(state.firstTapTime).toBe(0)
	})
})
