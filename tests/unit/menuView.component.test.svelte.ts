// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/svelte'
import MenuView from '../../src/routes/MenuView.svelte'
import { Operator } from '$lib/constants/Operator'
import { toast_validation_error } from '$lib/paraglide/messages.js'
import { createTestQuiz } from './component-setup'

describe('MenuView', () => {
	afterEach(() => {
		cleanup()
		vi.clearAllMocks()
	})

	it('shows a validation toast when Start is clicked with invalid settings', async () => {
		const onGetReady = vi.fn()
		const quiz = createTestQuiz()
		quiz.operatorSettings[Operator.Addition].range = [10, 1]

		const { getByTestId, findByText } = render(MenuView, {
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
