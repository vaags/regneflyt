import { describe, expect, it, vi } from 'vitest'
import { copyTextWithFeedback } from '$lib/helpers/layout/layoutActionsHelper'

describe('copyTextWithFeedback', () => {
	it('calls success callback when clipboard write succeeds', async () => {
		const writeText = vi.fn(() => Promise.resolve(undefined))
		const onSuccess = vi.fn()
		const onError = vi.fn()

		await copyTextWithFeedback('copy-me', {
			writeText,
			onSuccess,
			onError,
			logError: vi.fn()
		})

		expect(writeText).toHaveBeenCalledWith('copy-me')
		expect(onSuccess).toHaveBeenCalledTimes(1)
		expect(onError).not.toHaveBeenCalled()
	})

	it('calls error callback when clipboard API is unavailable', async () => {
		const onSuccess = vi.fn()
		const onError = vi.fn()
		const logError = vi.fn()

		await copyTextWithFeedback('copy-me', {
			onSuccess,
			onError,
			logError
		})

		expect(onSuccess).not.toHaveBeenCalled()
		expect(onError).toHaveBeenCalledTimes(1)
		expect(logError).toHaveBeenCalledTimes(1)
	})

	it('calls error callback when clipboard write rejects', async () => {
		const writeText = vi.fn(() => {
			throw new Error('write failed')
		})
		const onSuccess = vi.fn()
		const onError = vi.fn()
		const logError = vi.fn()

		await copyTextWithFeedback('copy-me', {
			writeText,
			onSuccess,
			onError,
			logError
		})

		expect(onSuccess).not.toHaveBeenCalled()
		expect(onError).toHaveBeenCalledTimes(1)
		expect(logError).toHaveBeenCalledTimes(1)
	})
})
