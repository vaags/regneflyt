// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, fireEvent } from '@testing-library/svelte'
import NumpadComponent from '$lib/components/widgets/NumpadComponent.svelte'

vi.mock('$lib/paraglide/messages.js', () => ({
	button_delete: () => 'Delete',
	button_next: () => 'Next',
	sr_numpad: () => 'Number pad',
	sr_numpad_minus: () => 'Minus'
}))

describe('NumpadComponent', () => {
	afterEach(cleanup)

	it('builds a multi-digit value with the on-screen buttons', async () => {
		const props = $state({ value: undefined as number | undefined })
		const { getByTestId } = render(NumpadComponent, { props })

		await fireEvent.click(getByTestId('numpad-1'))
		await fireEvent.click(getByTestId('numpad-2'))
		await fireEvent.click(getByTestId('numpad-3'))

		expect(props.value).toBe(123)
	})

	it('caps button input at four digits', async () => {
		const props = $state({ value: undefined as number | undefined })
		const { getByTestId } = render(NumpadComponent, { props })

		for (const digit of ['1', '2', '3', '4', '5']) {
			await fireEvent.click(getByTestId(`numpad-${digit}`))
		}

		expect(props.value).toBe(1234)
	})

	it('allows four digits after a minus sign', async () => {
		const props = $state({ value: undefined as number | undefined })
		const { getByTestId } = render(NumpadComponent, { props })

		await fireEvent.click(getByTestId('numpad-minus'))
		for (const digit of ['1', '2', '3', '4']) {
			await fireEvent.click(getByTestId(`numpad-${digit}`))
		}

		expect(props.value).toBe(-1234)
	})

	it('toggles negative values with the minus button', async () => {
		const props = $state({ value: undefined as number | undefined })
		const { getByTestId } = render(NumpadComponent, { props })

		await fireEvent.click(getByTestId('numpad-minus'))
		expect(Object.is(props.value, -0)).toBe(true)
		await fireEvent.click(getByTestId('numpad-7'))
		expect(props.value).toBe(-7)
		await fireEvent.click(getByTestId('numpad-minus'))
		expect(props.value).toBe(7)
	})

	it('clears the value with the delete button', async () => {
		const props = $state<{ value: number | undefined }>({ value: 98 })
		const { getByTestId } = render(NumpadComponent, { props })

		await fireEvent.click(getByTestId('numpad-delete'))

		expect(props.value).toBeUndefined()
	})

	it('reports value changes to the quiz owner', async () => {
		const onValueChange = vi.fn()
		const { getByTestId } = render(NumpadComponent, { onValueChange })

		await fireEvent.click(getByTestId('numpad-5'))

		expect(onValueChange).toHaveBeenCalledWith(5)
	})

	it('submits through the next button when enabled', async () => {
		const onCompletePuzzle = vi.fn()
		const { getByTestId } = render(NumpadComponent, { onCompletePuzzle })

		await fireEvent.click(getByTestId('numpad-next'))

		expect(onCompletePuzzle).toHaveBeenCalledOnce()
	})

	it('does not submit through a disabled next button', async () => {
		const onCompletePuzzle = vi.fn()
		const { getByTestId } = render(NumpadComponent, {
			disabledNext: true,
			onCompletePuzzle
		})

		await fireEvent.click(getByTestId('numpad-next'))

		expect(onCompletePuzzle).not.toHaveBeenCalled()
	})
})
