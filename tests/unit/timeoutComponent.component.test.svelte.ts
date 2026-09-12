// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/svelte'
import TimeoutComponent from '#lib/components/widgets/TimeoutComponent.svelte'
import { TimerState } from '#lib/constants/TimerState.ts'

vi.mock('svelte/motion', () => ({
	tweened: <T>(initialValue: T) => {
		let value = initialValue
		const subscribers = new Set<(value: T) => void>()

		return {
			subscribe(subscriber: (value: T) => void) {
				subscribers.add(subscriber)
				subscriber(value)
				return () => subscribers.delete(subscriber)
			},
			set(nextValue: T) {
				value = nextValue
				for (const subscriber of subscribers) subscriber(value)
				return Promise.resolve()
			}
		}
	}
}))

describe('TimeoutComponent', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(0)
	})

	afterEach(() => {
		cleanup()
		vi.useRealTimers()
	})

	it('reports second changes and completion', async () => {
		const onSecondChange = vi.fn()
		const onFinished = vi.fn()
		const { container } = render(TimeoutComponent, {
			seconds: 3,
			onSecondChange,
			onFinished
		})

		expect(container.textContent).toBe('3')

		await vi.advanceTimersByTimeAsync(1000)
		expect(onSecondChange).toHaveBeenLastCalledWith(2)
		expect(container.textContent).toBe('2')

		await vi.advanceTimersByTimeAsync(2000)
		expect(onFinished).toHaveBeenCalledOnce()
	})

	it('pauses and resumes from the remaining duration', async () => {
		const onSecondChange = vi.fn()
		const onFinished = vi.fn()
		const { rerender } = render(TimeoutComponent, {
			seconds: 3,
			timerState: TimerState.Started,
			onSecondChange,
			onFinished
		})

		await vi.advanceTimersByTimeAsync(1250)
		await rerender({
			seconds: 3,
			timerState: TimerState.Paused,
			onSecondChange,
			onFinished
		})
		await vi.advanceTimersByTimeAsync(5000)
		expect(onFinished).not.toHaveBeenCalled()

		await rerender({
			seconds: 3,
			timerState: TimerState.Resumed,
			onSecondChange,
			onFinished
		})
		await vi.advanceTimersByTimeAsync(1749)
		expect(onFinished).not.toHaveBeenCalled()
		await vi.advanceTimersByTimeAsync(1)
		expect(onFinished).toHaveBeenCalledOnce()
	})

	it('cancels countdown and fade callbacks when destroyed', async () => {
		const onSecondChange = vi.fn()
		const onFinished = vi.fn()
		const { unmount } = render(TimeoutComponent, {
			seconds: 3,
			fadeOnSecondChange: true,
			onSecondChange,
			onFinished
		})

		unmount()
		await vi.advanceTimersByTimeAsync(10_000)

		expect(onSecondChange).not.toHaveBeenCalled()
		expect(onFinished).not.toHaveBeenCalled()
	})

	it('exposes progress-bar value semantics', () => {
		const { getByRole } = render(TimeoutComponent, {
			seconds: 2,
			showProgressBar: true,
			timerState: TimerState.Started
		})

		const progressBar = getByRole('progressbar')
		expect(progressBar.getAttribute('aria-valuenow')).toBe('100')
		expect(progressBar.getAttribute('aria-valuemin')).toBe('0')
		expect(progressBar.getAttribute('aria-valuemax')).toBe('100')
	})
})
