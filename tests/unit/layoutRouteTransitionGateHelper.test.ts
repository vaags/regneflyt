import { describe, expect, it, vi } from 'vitest'
import { scheduleRouteNavigationGateRelease } from '$lib/helpers/layout/layoutRouteTransitionGateHelper'

describe('scheduleRouteNavigationGateRelease', () => {
	it('releases the gate after navigationComplete resolves and two animation frames', async () => {
		const requestAnimationFrameFn = vi
			.fn<(callback: () => void) => number>()
			.mockImplementation((callback) => {
				callback()
				return 1
			})
		const onSettled = vi.fn()

		scheduleRouteNavigationGateRelease(
			Promise.resolve(),
			requestAnimationFrameFn,
			onSettled
		)

		expect(onSettled).not.toHaveBeenCalled()

		await Promise.resolve()
		await Promise.resolve()

		expect(requestAnimationFrameFn).toHaveBeenCalledTimes(2)
		expect(onSettled).toHaveBeenCalledTimes(1)
	})

	it('does not release the gate before navigationComplete resolves', async () => {
		const requestAnimationFrameFn = vi
			.fn<(callback: () => void) => number>()
			.mockImplementation((callback) => {
				callback()
				return 1
			})
		const onSettled = vi.fn()
		let resolveNavigation: (() => void) | undefined

		scheduleRouteNavigationGateRelease(
			new Promise((resolve) => {
				resolveNavigation = resolve
			}),
			requestAnimationFrameFn,
			onSettled
		)

		expect(requestAnimationFrameFn).not.toHaveBeenCalled()
		expect(onSettled).not.toHaveBeenCalled()

		resolveNavigation?.()
		await Promise.resolve()
		await Promise.resolve()
		await Promise.resolve()

		expect(onSettled).toHaveBeenCalledTimes(1)
	})

	it('releases the gate even when navigationComplete rejects (failed or aborted navigation)', async () => {
		const requestAnimationFrameFn = vi
			.fn<(callback: () => void) => number>()
			.mockImplementation((callback) => {
				callback()
				return 1
			})
		const onSettled = vi.fn()

		scheduleRouteNavigationGateRelease(
			Promise.reject(new Error('navigation aborted')),
			requestAnimationFrameFn,
			onSettled
		)

		await Promise.resolve()
		await Promise.resolve()

		expect(onSettled).toHaveBeenCalledTimes(1)
	})
})
