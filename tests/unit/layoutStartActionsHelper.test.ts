import { describe, expect, it } from 'vitest'
import {
	registerStickyStartActions,
	resolveStickyReplayAction,
	resolveStickyStartAction
} from '$lib/helpers/layout/layoutStartActionsHelper'
import type { StickyGlobalNavStartActions } from '$lib/contexts/stickyGlobalNavContext'

describe('registerStickyStartActions', () => {
	it('registers actions and increments token', () => {
		let token = 0
		let currentActions: StickyGlobalNavStartActions | undefined
		const actions: StickyGlobalNavStartActions = { onStart: () => undefined }

		registerStickyStartActions(actions, {
			getCurrentToken: () => token,
			setToken: (value) => {
				token = value
			},
			setActions: (value) => {
				currentActions = value
			},
			resetToken: () => {
				token = 0
			}
		})

		expect(token).toBe(1)
		expect(currentActions).toBe(actions)
	})

	it('cleanup clears only when token still matches registration token', () => {
		let token = 0
		let currentActions: StickyGlobalNavStartActions | undefined
		const first: StickyGlobalNavStartActions = { onStart: () => undefined }
		const second: StickyGlobalNavStartActions = { onStart: () => undefined }

		const cleanupFirst = registerStickyStartActions(first, {
			getCurrentToken: () => token,
			setToken: (value) => {
				token = value
			},
			setActions: (value) => {
				currentActions = value
			},
			resetToken: () => {
				token = 0
			}
		})
		const cleanupSecond = registerStickyStartActions(second, {
			getCurrentToken: () => token,
			setToken: (value) => {
				token = value
			},
			setActions: (value) => {
				currentActions = value
			},
			resetToken: () => {
				token = 0
			}
		})

		cleanupFirst()
		expect(currentActions).toBe(second)
		expect(token).toBe(2)

		cleanupSecond()
		expect(currentActions).toBeUndefined()
		expect(token).toBe(0)
	})
})

describe('resolveStickyStartAction', () => {
	it('prefers registered start action over fallback', () => {
		const registered = () => undefined
		const fallback = () => undefined

		expect(resolveStickyStartAction({ onStart: registered }, fallback)).toBe(
			registered
		)
	})

	it('returns fallback when no registered start actions exist', () => {
		const fallback = () => undefined
		expect(resolveStickyStartAction(undefined, fallback)).toBe(fallback)
	})
})

describe('resolveStickyReplayAction', () => {
	it('prefers registered replay action over fallback', () => {
		const replay = () => undefined
		const fallback = () => undefined

		expect(
			resolveStickyReplayAction(
				{ onStart: () => undefined, onReplay: replay },
				true,
				fallback
			)
		).toBe(replay)
	})

	it('returns fallback when results exist and no replay override is registered', () => {
		const fallback = () => undefined
		expect(
			resolveStickyReplayAction({ onStart: () => undefined }, true, fallback)
		).toBe(fallback)
	})

	it('returns undefined when no replay override and no replayable results', () => {
		expect(
			resolveStickyReplayAction(
				{ onStart: () => undefined },
				false,
				() => undefined
			)
		).toBeUndefined()
	})
})
