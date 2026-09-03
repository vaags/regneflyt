// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/svelte'
import { tick } from 'svelte'
import TweenedValueComponent from '#lib/components/widgets/TweenedValueComponent.svelte'

const setTweenedValue = vi.fn()

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
				setTweenedValue(nextValue)
				value = nextValue
				for (const subscriber of subscribers) subscriber(value)
				return Promise.resolve()
			}
		}
	}
}))

describe('TweenedValueComponent', () => {
	afterEach(() => {
		cleanup()
		setTweenedValue.mockClear()
	})

	it('defers its initial tween until enabled', async () => {
		const { container, rerender } = render(TweenedValueComponent, {
			props: { value: 42, enabled: false }
		})

		await tick()
		expect(setTweenedValue).not.toHaveBeenCalled()
		expect(container.textContent).toBe('0')

		await rerender({ value: 42, enabled: true })
		await tick()
		expect(setTweenedValue).toHaveBeenCalledExactlyOnceWith(42)
		expect(container.textContent).toBe('42')
	})
})
