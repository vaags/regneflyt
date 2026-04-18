import { describe, expect, it, vi } from 'vitest'
import { handleLayoutBeforeNavigate } from '$lib/helpers/layout/layoutBeforeNavigateHelper'

describe('handleLayoutBeforeNavigate', () => {
	it('does nothing when navigation target is missing', () => {
		const cancelNavigation = vi.fn()
		const guardHandler = vi.fn()

		handleLayoutBeforeNavigate(undefined, cancelNavigation, guardHandler)

		expect(guardHandler).not.toHaveBeenCalled()
	})

	it('passes external navigation payload to guard handler', () => {
		const cancelNavigation = vi.fn()
		const guardHandler = vi.fn()
		const to = {
			url: new URL('https://example.com/results?difficulty=1'),
			route: null
		}

		handleLayoutBeforeNavigate(to, cancelNavigation, guardHandler)

		expect(guardHandler).toHaveBeenCalledWith({
			toUrl: to.url,
			isInternalNavigation: false,
			cancelNavigation
		})
	})

	it('marks navigation as internal when route id exists', () => {
		const cancelNavigation = vi.fn()
		const guardHandler = vi.fn()
		const to = {
			url: new URL('https://example.com/quiz'),
			route: { id: '/quiz' }
		}

		handleLayoutBeforeNavigate(to, cancelNavigation, guardHandler)

		expect(guardHandler).toHaveBeenCalledWith({
			toUrl: to.url,
			isInternalNavigation: true,
			cancelNavigation
		})
	})
})
