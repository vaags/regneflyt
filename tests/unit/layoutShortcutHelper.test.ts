import { describe, expect, it, vi } from 'vitest'
import {
	handleDevToolsShortcut,
	handleOnboardingShortcut,
	isDevToolsShortcut,
	isOnboardingShortcut
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
	it('ignores shortcut in production', () => {
		const event = createEvent({ metaKey: true, shiftKey: true, key: 'd' })
		const toggle = vi.fn()

		expect(handleDevToolsShortcut(event, true, toggle)).toBe(false)
		expect(toggle).not.toHaveBeenCalled()
		expect(event.preventDefault).not.toHaveBeenCalled()
	})

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

		expect(handleDevToolsShortcut(prevented, false, toggle)).toBe(false)
		expect(handleDevToolsShortcut(repeated, false, toggle)).toBe(false)
		expect(toggle).not.toHaveBeenCalled()
	})

	it('prevents default and toggles for matching shortcut', () => {
		const event = createEvent({ metaKey: true, shiftKey: true, key: 'd' })
		const toggle = vi.fn()

		expect(handleDevToolsShortcut(event, false, toggle)).toBe(true)
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
