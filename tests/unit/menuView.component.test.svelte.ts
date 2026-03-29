// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/svelte'
import { Operator } from '$lib/constants/Operator'
import { toast_validation_error } from '$lib/paraglide/messages.js'
import { dismissToast } from '$lib/stores'
import { createTestQuiz } from './component-setup'
import MenuViewWithGlobalToastHarness from './mocks/MenuViewWithGlobalToastHarness.svelte'

describe('MenuView', () => {
	afterEach(() => {
		cleanup()
		vi.clearAllMocks()
		dismissToast()
	})

	it('shows a validation toast in the DOM when Start is clicked with invalid settings', async () => {
		const onGetReady = vi.fn()
		const quiz = createTestQuiz()
		quiz.operatorSettings[Operator.Addition].range = [10, 1]

		const { getByTestId, findByText } = render(MenuViewWithGlobalToastHarness, {
			props: {
				quiz,
				onGetReady
			}
		})

		await fireEvent.click(getByTestId('btn-start'))

		expect(await findByText(toast_validation_error())).toBeTruthy()
		expect(onGetReady).not.toHaveBeenCalled()
	})
})
