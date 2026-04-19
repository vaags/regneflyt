import { describe, expect, it, vi } from 'vitest'
import {
	copyTextWithFeedback,
	registerStickyStartActions,
	resolveStickyReplayAction,
	resolveStickyStartAction,
	simulateUpdateNotificationAfterEnsure
} from '$lib/helpers/layout/layoutActionsHelper'
import type { StickyGlobalNavStartActions } from '$lib/contexts/stickyGlobalNavContext'

describe('layoutActionsHelper', () => {
	describe('copyTextWithFeedback', () => {
		it('calls success callback when write succeeds', async () => {
			const writeText = vi.fn().mockResolvedValue(undefined)
			const onSuccess = vi.fn()
			const onError = vi.fn()

			await copyTextWithFeedback('test text', {
				writeText,
				onSuccess,
				onError,
				logError: () => {}
			})

			expect(writeText).toHaveBeenCalledWith('test text')
			expect(onSuccess).toHaveBeenCalled()
			expect(onError).not.toHaveBeenCalled()
		})

		it('calls error callback when write fails', async () => {
			const error = new Error('Copy failed')
			const writeText = vi.fn().mockRejectedValue(error)
			const onSuccess = vi.fn()
			const onError = vi.fn()
			const logError = vi.fn()

			await copyTextWithFeedback('test text', {
				writeText,
				onSuccess,
				onError,
				logError
			})

			expect(onError).toHaveBeenCalled()
			expect(onSuccess).not.toHaveBeenCalled()
			expect(logError).toHaveBeenCalledWith('Copy link failed:', error)
		})

		it('handles missing writeText API', async () => {
			const onSuccess = vi.fn()
			const onError = vi.fn()
			const logError = vi.fn()

			await copyTextWithFeedback('test text', {
				writeText: undefined,
				onSuccess,
				onError,
				logError
			})

			expect(onError).toHaveBeenCalled()
			expect(onSuccess).not.toHaveBeenCalled()
			expect(logError).toHaveBeenCalledWith(
				'Copy link failed:',
				expect.any(Error)
			)
		})
	})

	describe('registerStickyStartActions', () => {
		it('increments token and sets actions', () => {
			const setToken = vi.fn()
			const setActions = vi.fn()
			const actions: StickyGlobalNavStartActions = { onStart: () => {} }

			registerStickyStartActions(actions, {
				getCurrentToken: () => 0,
				setToken,
				setActions,
				resetToken: () => {}
			})

			expect(setToken).toHaveBeenCalledWith(1)
			expect(setActions).toHaveBeenCalledWith(actions)
		})

		it('returns unregister function', () => {
			const actions: StickyGlobalNavStartActions = { onStart: () => {} }
			const result = registerStickyStartActions(actions, {
				getCurrentToken: () => 0,
				setToken: () => {},
				setActions: () => {},
				resetToken: () => {}
			})

			expect(typeof result).toBe('function')
		})

		it('unregister clears actions when token matches', () => {
			let currentToken = 0
			const setActions = vi.fn()
			const setToken = (token: number) => {
				currentToken = token
			}
			const resetToken = vi.fn()
			const actions: StickyGlobalNavStartActions = { onStart: () => {} }

			const unregister = registerStickyStartActions(actions, {
				getCurrentToken: () => currentToken,
				setToken,
				setActions,
				resetToken
			})

			unregister()

			expect(setActions).toHaveBeenLastCalledWith(undefined)
			expect(resetToken).toHaveBeenCalled()
		})

		it('unregister does nothing when token does not match', () => {
			const setActions = vi.fn()
			const resetToken = vi.fn()
			const actions: StickyGlobalNavStartActions = { onStart: () => {} }

			const unregister = registerStickyStartActions(actions, {
				getCurrentToken: () => 99,
				setToken: () => {},
				setActions,
				resetToken
			})

			unregister()

			expect(setActions).not.toHaveBeenCalledWith(undefined)
			expect(resetToken).not.toHaveBeenCalled()
		})
	})

	describe('resolveStickyStartAction', () => {
		it('returns provided onStart when actions exist', () => {
			const onStart = vi.fn()
			const fallback = vi.fn()
			const actions: StickyGlobalNavStartActions = { onStart }

			const result = resolveStickyStartAction(actions, fallback)

			expect(result).toBe(onStart)
		})

		it('returns fallback when actions are undefined', () => {
			const fallback = vi.fn()

			const result = resolveStickyStartAction(undefined, fallback)

			expect(result).toBe(fallback)
		})

		it('invokes the returned action function', () => {
			const onStart = vi.fn()
			const fallback = vi.fn()
			const actions: StickyGlobalNavStartActions = { onStart }

			const result = resolveStickyStartAction(actions, fallback)
			result()

			expect(onStart).toHaveBeenCalled()
			expect(fallback).not.toHaveBeenCalled()
		})
	})

	describe('resolveStickyReplayAction', () => {
		it('returns provided onReplay when actions exist', () => {
			const onReplay = vi.fn()
			const fallback = vi.fn()
			const actions: StickyGlobalNavStartActions = {
				onStart: () => {},
				onReplay
			}

			const result = resolveStickyReplayAction(actions, true, fallback)

			expect(result).toBe(onReplay)
		})

		it('returns fallback when actions are undefined but results are replayable', () => {
			const fallback = vi.fn()

			const result = resolveStickyReplayAction(undefined, true, fallback)

			expect(result).toBe(fallback)
		})

		it('returns undefined when results are not replayable and no onReplay', () => {
			const fallback = vi.fn()
			const actions: StickyGlobalNavStartActions = { onStart: () => {} }

			const result = resolveStickyReplayAction(actions, false, fallback)

			expect(result).toBeUndefined()
		})

		it('returns fallback when actions undefined and results replayable', () => {
			const fallback = vi.fn()

			const result = resolveStickyReplayAction(undefined, true, fallback)

			expect(result).toBe(fallback)
		})
	})

	describe('simulateUpdateNotificationAfterEnsure', () => {
		it('calls ensureUpdateNotification then showUpdateNotification', async () => {
			const ensureUpdateNotification = vi.fn().mockResolvedValue(undefined)
			const showUpdateNotification = vi.fn()

			await simulateUpdateNotificationAfterEnsure(
				ensureUpdateNotification,
				showUpdateNotification
			)

			expect(ensureUpdateNotification).toHaveBeenCalledOnce()
			expect(showUpdateNotification).toHaveBeenCalledOnce()
		})

		it('maintains order: ensure before show', async () => {
			const callOrder: string[] = []
			const ensureUpdateNotification = vi.fn().mockImplementation(() => {
				callOrder.push('ensure')
				return Promise.resolve()
			})
			const showUpdateNotification = () => {
				callOrder.push('show')
			}

			await simulateUpdateNotificationAfterEnsure(
				ensureUpdateNotification,
				showUpdateNotification
			)

			expect(callOrder).toEqual(['ensure', 'show'])
		})

		it('propagates ensure rejection', async () => {
			const error = new Error('Load failed')
			const ensureUpdateNotification = vi.fn().mockRejectedValue(error)
			const showUpdateNotification = vi.fn()

			await expect(
				simulateUpdateNotificationAfterEnsure(
					ensureUpdateNotification,
					showUpdateNotification
				)
			).rejects.toThrow(error)

			expect(showUpdateNotification).not.toHaveBeenCalled()
		})
	})
})
