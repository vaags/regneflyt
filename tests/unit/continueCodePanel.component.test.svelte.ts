// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte'
import {
	alert_invalid_progress_code,
	button_load_progress_code,
	button_show_progress_code,
	confirm_load_progress_code_message,
	toast_progress_code_copied,
	toast_progress_code_loaded
} from '$lib/paraglide/messages.js'
import { adaptiveSkills, activeToast, dismissToast } from '$lib/stores'
import { encodeProgressCode } from '$lib/helpers/continueCodeHelper'
import { defaultAdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
import ContinueCodePanel from '$lib/components/panels/ContinueCodePanel.svelte'

describe('ContinueCodePanel', () => {
	afterEach(() => {
		cleanup()
		dismissToast()
		adaptiveSkills.current = [...defaultAdaptiveSkillMap]
	})

	it('renders launcher buttons instead of showing the code and input up front', () => {
		const { getByTestId } = render(ContinueCodePanel)

		expect(getByTestId('btn-show-progress-code').textContent).toContain(
			button_show_progress_code()
		)
		expect(getByTestId('btn-load-progress-code').textContent).toContain(
			button_load_progress_code()
		)
		expect(
			getByTestId('progress-code-display').closest('dialog')?.open ?? false
		).toBe(false)
		expect(
			getByTestId('input-progress-code').closest('dialog')?.open ?? false
		).toBe(false)
	})

	it('shows the encoded current skill state inside the show-code dialog', async () => {
		adaptiveSkills.current = [10, 20, 30, 40]

		const { getByTestId } = render(ContinueCodePanel)

		await fireEvent.click(getByTestId('btn-show-progress-code'))

		expect(
			(getByTestId('progress-code-display') as HTMLInputElement).value
		).toBe(encodeProgressCode([10, 20, 30, 40]))
	})

	it('copies the current code to the clipboard and shows a confirmation toast', async () => {
		adaptiveSkills.current = [5, 15, 25, 35]
		const writeText = vi.fn(() => Promise.resolve())
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText },
			configurable: true
		})

		const { getByTestId } = render(ContinueCodePanel)

		await fireEvent.click(getByTestId('btn-show-progress-code'))
		await fireEvent.click(getByTestId('btn-copy-progress-code'))

		expect(writeText).toHaveBeenCalledWith(encodeProgressCode([5, 15, 25, 35]))
		await waitFor(() => {
			expect(activeToast.current?.message).toBe(toast_progress_code_copied())
		})
	})

	it('shows the warning and an error, and does not change skills for an invalid code', async () => {
		adaptiveSkills.current = [1, 2, 3, 4]

		const { getByTestId, findByText } = render(ContinueCodePanel)

		await fireEvent.click(getByTestId('btn-load-progress-code'))

		expect(await findByText(confirm_load_progress_code_message())).toBeTruthy()
		await fireEvent.input(getByTestId('input-progress-code'), {
			target: { value: 'NOT-A-REAL-CODE' }
		})
		await fireEvent.click(getByTestId('btn-confirm-load-progress-code'))

		expect(await findByText(alert_invalid_progress_code())).toBeTruthy()
		expect(adaptiveSkills.current).toEqual([1, 2, 3, 4])
	})

	it('opts the code input out of autocorrection and links it to its error', async () => {
		const { getByTestId, findByText } = render(ContinueCodePanel)

		await fireEvent.click(getByTestId('btn-load-progress-code'))
		const input = getByTestId('input-progress-code')

		expect(input.getAttribute('autocomplete')).toBe('off')
		expect(input.getAttribute('autocapitalize')).toBe('none')
		expect(input.getAttribute('autocorrect')).toBe('off')
		expect(input.getAttribute('spellcheck')).toBe('false')
		expect(input.getAttribute('aria-invalid')).toBeNull()

		// The region must stay mounted so its first update is announced.
		expect(getByTestId('progress-code-input-error').textContent.trim()).toBe('')

		await fireEvent.input(input, { target: { value: 'NOT-A-REAL-CODE' } })
		await fireEvent.click(getByTestId('btn-confirm-load-progress-code'))
		await findByText(alert_invalid_progress_code())

		expect(input.getAttribute('aria-invalid')).toBe('true')
		const describedBy = input.getAttribute('aria-describedby')
		expect(describedBy).toBeTruthy()
		expect(document.getElementById(describedBy ?? '')?.textContent).toContain(
			alert_invalid_progress_code()
		)
	})

	it('loads a valid code into adaptiveSkills directly from the load dialog', async () => {
		adaptiveSkills.current = [1, 2, 3, 4]
		const codeToLoad = encodeProgressCode([50, 60, 70, 80])

		const { getByTestId } = render(ContinueCodePanel)

		await fireEvent.click(getByTestId('btn-load-progress-code'))
		await fireEvent.input(getByTestId('input-progress-code'), {
			target: { value: codeToLoad }
		})
		await fireEvent.click(getByTestId('btn-confirm-load-progress-code'))

		expect(adaptiveSkills.current).toEqual([50, 60, 70, 80])
		await waitFor(() => {
			expect(activeToast.current?.message).toBe(toast_progress_code_loaded())
		})
	})

	it('leaves skills unchanged when the load dialog is dismissed', async () => {
		adaptiveSkills.current = [1, 2, 3, 4]
		const codeToLoad = encodeProgressCode([50, 60, 70, 80])

		const { getByTestId } = render(ContinueCodePanel)

		await fireEvent.click(getByTestId('btn-load-progress-code'))
		await fireEvent.input(getByTestId('input-progress-code'), {
			target: { value: codeToLoad }
		})
		const loadHeading = getByTestId('load-progress-code-heading')
		const loadDialog = loadHeading.closest('dialog')
		if (!loadDialog)
			throw new Error('Expected load-progress-code dialog to be rendered')
		const closeButton = loadDialog.querySelector<HTMLButtonElement>(
			'[data-testid="btn-dialog-close"]'
		)
		if (!closeButton)
			throw new Error('Expected load dialog close button to be rendered')
		await fireEvent.click(closeButton)

		expect(adaptiveSkills.current).toEqual([1, 2, 3, 4])
	})
})
