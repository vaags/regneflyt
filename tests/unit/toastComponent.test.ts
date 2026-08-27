// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/svelte'
import { tick } from 'svelte'
import ToastComponent from '$lib/components/widgets/ToastComponent.svelte'
import { notificationTiming } from '$lib/stores'

describe('ToastComponent dismissal lifecycle', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		notificationTiming.current = 'auto-dismiss'
	})

	afterEach(() => {
		cleanup()
		vi.useRealTimers()
	})

	it('dismisses success feedback after 3500 ms', async () => {
		const onDismiss = vi.fn()
		render(ToastComponent, { message: 'Saved', onDismiss })
		await tick()

		await vi.advanceTimersByTimeAsync(3499)
		expect(onDismiss).not.toHaveBeenCalled()

		await vi.advanceTimersByTimeAsync(1)
		expect(onDismiss).toHaveBeenCalledOnce()
	})

	it('keeps error feedback available until 6500 ms', async () => {
		const onDismiss = vi.fn()
		render(ToastComponent, { message: 'Failed', variant: 'error', onDismiss })
		await tick()

		await vi.advanceTimersByTimeAsync(6499)
		expect(onDismiss).not.toHaveBeenCalled()

		await vi.advanceTimersByTimeAsync(1)
		expect(onDismiss).toHaveBeenCalledOnce()
	})

	it('honors an explicit auto-dismiss duration', async () => {
		const onDismiss = vi.fn()
		render(ToastComponent, {
			message: 'Copied',
			autoDismissMs: 1200,
			onDismiss
		})
		await tick()

		await vi.advanceTimersByTimeAsync(1199)
		expect(onDismiss).not.toHaveBeenCalled()

		await vi.advanceTimersByTimeAsync(1)
		expect(onDismiss).toHaveBeenCalledOnce()
	})

	it('keeps persistent feedback until it is dismissed explicitly', async () => {
		const onDismiss = vi.fn()
		const { getByTestId } = render(ToastComponent, {
			message: 'Enter an answer',
			variant: 'error',
			autoDismissMs: null,
			onDismiss
		})
		await tick()

		await vi.advanceTimersByTimeAsync(60_000)
		expect(onDismiss).not.toHaveBeenCalled()

		getByTestId('btn-toast-dismiss').click()
		expect(onDismiss).toHaveBeenCalledOnce()
	})

	it('keeps default feedback until dismissed when the user selects persistent notifications', async () => {
		notificationTiming.current = 'persistent'
		const onDismiss = vi.fn()
		const { getByTestId } = render(ToastComponent, {
			message: 'Saved',
			onDismiss
		})
		await tick()

		await vi.advanceTimersByTimeAsync(60_000)
		expect(onDismiss).not.toHaveBeenCalled()

		getByTestId('btn-toast-dismiss').click()
		expect(onDismiss).toHaveBeenCalledOnce()
	})

	it('preserves an explicit duration when the user selects persistent notifications', async () => {
		notificationTiming.current = 'persistent'
		const onDismiss = vi.fn()
		render(ToastComponent, {
			message: 'Copied',
			autoDismissMs: 1200,
			onDismiss
		})
		await tick()

		await vi.advanceTimersByTimeAsync(1200)
		expect(onDismiss).toHaveBeenCalledOnce()
	})

	it('clears the pending auto-dismiss when a manually dismissed toast unmounts', async () => {
		const onDismiss = vi.fn()
		const { getByTestId, unmount } = render(ToastComponent, {
			message: 'Saved',
			onDismiss
		})
		await tick()

		getByTestId('btn-toast-dismiss').click()
		expect(onDismiss).toHaveBeenCalledOnce()

		unmount()
		await vi.advanceTimersByTimeAsync(3500)
		expect(onDismiss).toHaveBeenCalledOnce()
	})
})

describe('ToastComponent bottom navigation clearance', () => {
	afterEach(cleanup)

	it.each([
		['none', 'bottom-4'],
		[
			'compact',
			'bottom-[calc(var(--measured-global-nav-height,var(--sticky-global-nav-clearance))+0.5rem)]'
		],
		[
			'expanded',
			'bottom-[calc(var(--measured-global-nav-height,var(--sticky-global-nav-expanded-clearance))+0.5rem)]'
		]
	] as const)(
		'uses %s navigation clearance',
		(bottomNavSize, expectedClass) => {
			const { container } = render(ToastComponent, {
				message: 'Saved',
				bottomNavSize
			})

			expect(
				container
					.querySelector('.toast-root')
					?.classList.contains(expectedClass)
			).toBe(true)
		}
	)
})
