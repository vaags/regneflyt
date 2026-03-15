// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, fireEvent } from '@testing-library/svelte'
import NumpadComponent from '$lib/components/widgets/NumpadComponent.svelte'

vi.mock('$lib/paraglide/messages.js', () => ({
	button_delete: () => 'Delete',
	button_next: () => 'Next',
	sr_numpad: () => 'Number pad'
}))

describe('NumpadComponent', () => {
	afterEach(() => cleanup())

	describe('digit input via keyboard', () => {
		it('enters a single digit', async () => {
			const props = $state({ value: undefined as number | undefined })
			render(NumpadComponent, { props })

			await fireEvent.keyDown(window, { key: '5' })
			expect(props.value).toBe(5)
		})

		it('builds multi-digit numbers', async () => {
			const props = $state({ value: undefined as number | undefined })
			render(NumpadComponent, { props })

			await fireEvent.keyDown(window, { key: '1' })
			await fireEvent.keyDown(window, { key: '2' })
			await fireEvent.keyDown(window, { key: '3' })
			expect(props.value).toBe(123)
		})

		it('caps input at 4 digits', async () => {
			const props = $state({ value: undefined as number | undefined })
			render(NumpadComponent, { props })

			await fireEvent.keyDown(window, { key: '1' })
			await fireEvent.keyDown(window, { key: '2' })
			await fireEvent.keyDown(window, { key: '3' })
			await fireEvent.keyDown(window, { key: '4' })
			await fireEvent.keyDown(window, { key: '5' })
			expect(props.value).toBe(1234)
		})

		it('ignores non-numeric keys', async () => {
			const props = $state({ value: undefined as number | undefined })
			render(NumpadComponent, { props })

			await fireEvent.keyDown(window, { key: 'a' })
			await fireEvent.keyDown(window, { key: '!' })
			expect(props.value).toBeUndefined()
		})

		it('does not allow leading double zero', async () => {
			const props = $state({ value: undefined as number | undefined })
			render(NumpadComponent, { props })

			await fireEvent.keyDown(window, { key: '0' })
			await fireEvent.keyDown(window, { key: '0' })
			expect(props.value).toBe(0)
		})
	})

	describe('negative numbers', () => {
		it('sets negative zero when minus pressed with no input', async () => {
			const props = $state({ value: undefined as number | undefined })
			render(NumpadComponent, { props })

			await fireEvent.keyDown(window, { key: '-' })
			expect(Object.is(props.value, -0)).toBe(true)
		})

		it('toggles sign on existing number', async () => {
			const props = $state({ value: undefined as number | undefined })
			render(NumpadComponent, { props })

			await fireEvent.keyDown(window, { key: '4' })
			await fireEvent.keyDown(window, { key: '2' })
			expect(props.value).toBe(42)

			await fireEvent.keyDown(window, { key: '-' })
			expect(props.value).toBe(-42)

			await fireEvent.keyDown(window, { key: '-' })
			expect(props.value).toBe(42)
		})

		it('enters digit after negative zero', async () => {
			const props = $state({ value: undefined as number | undefined })
			render(NumpadComponent, { props })

			await fireEvent.keyDown(window, { key: '-' })
			await fireEvent.keyDown(window, { key: '7' })
			expect(props.value).toBe(-7)
		})
	})

	describe('backspace and delete', () => {
		it('removes last digit with Backspace', async () => {
			const props = $state({ value: undefined as number | undefined })
			render(NumpadComponent, { props })

			await fireEvent.keyDown(window, { key: '1' })
			await fireEvent.keyDown(window, { key: '2' })
			await fireEvent.keyDown(window, { key: '3' })
			await fireEvent.keyDown(window, { key: 'Backspace' })
			expect(props.value).toBe(12)
		})

		it('clears to undefined when last digit removed', async () => {
			const props = $state({ value: undefined as number | undefined })
			render(NumpadComponent, { props })

			await fireEvent.keyDown(window, { key: '5' })
			await fireEvent.keyDown(window, { key: 'Backspace' })
			expect(props.value).toBeUndefined()
		})

		it('clears negative zero to undefined on Backspace', async () => {
			const props = $state({ value: undefined as number | undefined })
			render(NumpadComponent, { props })

			await fireEvent.keyDown(window, { key: '-' })
			expect(Object.is(props.value, -0)).toBe(true)

			await fireEvent.keyDown(window, { key: 'Backspace' })
			expect(props.value).toBeUndefined()
		})

		it('resets entire input with Delete', async () => {
			const props = $state({ value: undefined as number | undefined })
			render(NumpadComponent, { props })

			await fireEvent.keyDown(window, { key: '9' })
			await fireEvent.keyDown(window, { key: '8' })
			await fireEvent.keyDown(window, { key: 'Delete' })
			expect(props.value).toBeUndefined()
		})

		it('backspace on negative single digit leaves negative zero', async () => {
			const props = $state({ value: undefined as number | undefined })
			render(NumpadComponent, { props })

			await fireEvent.keyDown(window, { key: '-' })
			await fireEvent.keyDown(window, { key: '3' })
			expect(props.value).toBe(-3)

			await fireEvent.keyDown(window, { key: 'Backspace' })
			expect(Object.is(props.value, -0)).toBe(true)
		})
	})

	describe('Enter / complete puzzle', () => {
		it('calls onCompletePuzzle on Enter when value is set', async () => {
			const onComplete = vi.fn()
			const props = $state({
				value: undefined as number | undefined,
				onCompletePuzzle: onComplete,
				disabledNext: false
			})
			render(NumpadComponent, { props })

			await fireEvent.keyDown(window, { key: '5' })
			await fireEvent.keyDown(window, { key: 'Enter' })
			expect(onComplete).toHaveBeenCalledOnce()
		})

		it('does not call onCompletePuzzle when value is undefined', async () => {
			const onComplete = vi.fn()
			const props = $state({
				value: undefined as number | undefined,
				onCompletePuzzle: onComplete,
				disabledNext: false
			})
			render(NumpadComponent, { props })

			await fireEvent.keyDown(window, { key: 'Enter' })
			expect(onComplete).not.toHaveBeenCalled()
		})

		it('does not call onCompletePuzzle when disabledNext is true', async () => {
			const onComplete = vi.fn()
			const props = $state({
				value: undefined as number | undefined,
				onCompletePuzzle: onComplete,
				disabledNext: true
			})
			render(NumpadComponent, { props })

			await fireEvent.keyDown(window, { key: '5' })
			await fireEvent.keyDown(window, { key: 'Enter' })
			expect(onComplete).not.toHaveBeenCalled()
		})
	})

	describe('button clicks', () => {
		it('enters digit via numpad button click', async () => {
			const props = $state({ value: undefined as number | undefined })
			const { getByTestId } = render(NumpadComponent, { props })

			await fireEvent.click(getByTestId('numpad-7'))
			expect(props.value).toBe(7)
		})

		it('resets input via delete button click', async () => {
			const props = $state({ value: undefined as number | undefined })
			const { getByTestId } = render(NumpadComponent, { props })

			await fireEvent.click(getByTestId('numpad-9'))
			await fireEvent.click(getByTestId('numpad-delete'))
			expect(props.value).toBeUndefined()
		})
	})
})
