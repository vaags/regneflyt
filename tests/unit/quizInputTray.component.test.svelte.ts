// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/svelte'
import QuizInputTray from '$lib/components/layout/QuizInputTray.svelte'

describe('QuizInputTray', () => {
	afterEach(() => cleanup())

	it('does not render when quiz controls are absent', () => {
		const { queryByTestId } = render(QuizInputTray, {
			props: { quizControls: undefined }
		})

		expect(queryByTestId('quiz-input-tray')).toBeNull()
	})

	it('renders the numpad and forwards quiz control handlers', async () => {
		const onValueChange = vi.fn()
		const onCompletePuzzle = vi.fn()
		const { getByTestId } = render(QuizInputTray, {
			props: {
				quizControls: {
					value: undefined,
					disabled: false,
					disabledNext: false,
					nextButtonColor: 'green',
					onValueChange,
					onCompletePuzzle
				}
			}
		})

		expect(getByTestId('quiz-input-tray')).toBeTruthy()

		await fireEvent.click(getByTestId('numpad-3'))
		expect(onValueChange).toHaveBeenCalledWith(3)

		await fireEvent.click(getByTestId('numpad-next'))
		expect(onCompletePuzzle).toHaveBeenCalledOnce()
	})
})
