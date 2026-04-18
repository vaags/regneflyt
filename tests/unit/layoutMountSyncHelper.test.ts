import { describe, expect, it, vi } from 'vitest'
import { setupLayoutMountSync } from '$lib/helpers/layoutMountSyncHelper'

type ListenerMap = Map<string, EventListener>

function createWindowSyncTarget(initialSearch = '?difficulty=1') {
	const windowListeners: ListenerMap = new Map()
	let mediaListener: (() => void) | undefined

	const mediaQuery = {
		addEventListener: vi.fn((type: 'change', listener: () => void) => {
			mediaListener = listener
		}),
		removeEventListener: vi.fn((type: 'change', listener: () => void) => {
			if (mediaListener === listener) {
				mediaListener = undefined
			}
		})
	}

	const target = {
		location: { search: initialSearch },
		matchMedia: vi.fn(() => mediaQuery),
		addEventListener: vi.fn((type: string, listener: EventListener) => {
			windowListeners.set(type, listener)
		}),
		removeEventListener: vi.fn((type: string, listener: EventListener) => {
			if (windowListeners.get(type) === listener) {
				windowListeners.delete(type)
			}
		})
	}

	return {
		target,
		mediaQuery,
		windowListeners,
		triggerThemeChange: () => {
			mediaListener?.()
		}
	}
}

describe('setupLayoutMountSync', () => {
	it('syncs search immediately and wires listeners', () => {
		const { target, mediaQuery, windowListeners } =
			createWindowSyncTarget('?difficulty=0')
		const applyTheme = vi.fn()
		const setCurrentSearch = vi.fn()

		setupLayoutMountSync(
			target,
			'regneflyt:quiz-query-updated',
			() => 'system',
			setCurrentSearch,
			applyTheme
		)

		expect(target.matchMedia).toHaveBeenCalledWith(
			'(prefers-color-scheme: dark)'
		)
		expect(setCurrentSearch).toHaveBeenCalledWith('?difficulty=0')
		expect(mediaQuery.addEventListener).toHaveBeenCalledTimes(1)
		expect(windowListeners.has('popstate')).toBe(true)
		expect(windowListeners.has('regneflyt:quiz-query-updated')).toBe(true)
	})

	it('applies system theme only when preference is system', () => {
		const { target, triggerThemeChange } = createWindowSyncTarget()
		const applyTheme = vi.fn()

		const cleanupSystem = setupLayoutMountSync(
			target,
			'regneflyt:quiz-query-updated',
			() => 'system',
			() => undefined,
			applyTheme
		)
		triggerThemeChange()
		expect(applyTheme).toHaveBeenCalledWith('system')
		cleanupSystem()

		const applyThemeNonSystem = vi.fn()
		const { target: target2, triggerThemeChange: trigger2 } =
			createWindowSyncTarget()
		const cleanupNonSystem = setupLayoutMountSync(
			target2,
			'regneflyt:quiz-query-updated',
			() => 'dark',
			() => undefined,
			applyThemeNonSystem
		)
		trigger2()
		expect(applyThemeNonSystem).not.toHaveBeenCalled()
		cleanupNonSystem()
	})

	it('syncs search from popstate and quiz-query-updated events', () => {
		const { target, windowListeners } = createWindowSyncTarget('?difficulty=1')
		const setCurrentSearch = vi.fn()

		setupLayoutMountSync(
			target,
			'regneflyt:quiz-query-updated',
			() => 'system',
			setCurrentSearch,
			() => undefined
		)

		target.location.search = '?difficulty=0'
		const popstate = windowListeners.get('popstate')
		popstate?.({} as Event)

		const quizQueryUpdated = windowListeners.get('regneflyt:quiz-query-updated')
		quizQueryUpdated?.({
			detail: { search: '?difficulty=1' }
		} as unknown as Event)

		expect(setCurrentSearch).toHaveBeenCalledWith('?difficulty=0')
		expect(setCurrentSearch).toHaveBeenCalledWith('?difficulty=1')
	})

	it('removes listeners on cleanup', () => {
		const { target } = createWindowSyncTarget()

		const cleanup = setupLayoutMountSync(
			target,
			'regneflyt:quiz-query-updated',
			() => 'system',
			() => undefined,
			() => undefined
		)
		cleanup()

		expect(target.removeEventListener).toHaveBeenCalledWith(
			'popstate',
			expect.any(Function)
		)
		expect(target.removeEventListener).toHaveBeenCalledWith(
			'regneflyt:quiz-query-updated',
			expect.any(Function)
		)
	})
})
