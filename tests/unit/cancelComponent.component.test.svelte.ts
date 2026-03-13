// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, fireEvent } from '@testing-library/svelte'
import CancelComponent from '../../src/components/screens/CancelComponent.svelte'

vi.mock('$lib/paraglide/messages.js', () => ({
	cancel_confirm: () => 'Cancel?',
	cancel_undo: () => 'Cancel quiz',
	cancel_complete_quiz: () => 'Complete quiz',
	button_yes: () => 'Yes',
	button_no: () => 'No'
}))

const abortQuiz = vi.fn()
const completeQuiz = vi.fn()

const cancelContext = new Map<string, () => void>([
	['abortQuiz', abortQuiz],
	['completeQuiz', completeQuiz]
])

function renderCancel(showCompleteButton = false) {
	return render(CancelComponent, {
		props: { showCompleteButton },
		context: cancelContext
	})
}

describe('CancelComponent', () => {
	afterEach(() => {
		cleanup()
		vi.clearAllMocks()
	})

	describe('initial state', () => {
		it('shows the cancel button', () => {
			const { getByTestId } = renderCancel()
			expect(getByTestId('btn-cancel')).toBeTruthy()
		})

		it('does not show the confirmation prompt initially', () => {
			const { queryByTestId } = renderCancel()
			expect(queryByTestId('cancel-confirm')).toBeNull()
		})

		it('hides the complete button when showCompleteButton is false', () => {
			const { queryByTestId } = renderCancel(false)
			expect(queryByTestId('btn-complete-quiz')).toBeNull()
		})

		it('shows the complete button when showCompleteButton is true', () => {
			const { getByTestId } = renderCancel(true)
			expect(getByTestId('btn-complete-quiz')).toBeTruthy()
		})
	})

	describe('cancel confirmation flow', () => {
		it('shows confirmation when cancel button is clicked', async () => {
			const { getByTestId, queryByTestId } = renderCancel()
			await fireEvent.click(getByTestId('btn-cancel'))
			expect(getByTestId('cancel-confirm').textContent).toBe('Cancel?')
			expect(getByTestId('btn-cancel-yes')).toBeTruthy()
			expect(queryByTestId('btn-cancel')).toBeNull()
		})

		it('calls abortQuiz when confirming Yes', async () => {
			const { getByTestId } = renderCancel()
			await fireEvent.click(getByTestId('btn-cancel'))
			await fireEvent.click(getByTestId('btn-cancel-yes'))
			expect(abortQuiz).toHaveBeenCalledOnce()
		})

		it('hides confirmation when No is clicked', async () => {
			const { getByTestId, getByText, queryByTestId } = renderCancel()
			await fireEvent.click(getByTestId('btn-cancel'))
			expect(getByTestId('cancel-confirm')).toBeTruthy()

			await fireEvent.click(getByText('No'))
			expect(queryByTestId('cancel-confirm')).toBeNull()
			expect(getByTestId('btn-cancel')).toBeTruthy()
		})
	})

	describe('complete button', () => {
		it('calls completeQuiz when complete button is clicked', async () => {
			const { getByTestId } = renderCancel(true)
			await fireEvent.click(getByTestId('btn-complete-quiz'))
			expect(completeQuiz).toHaveBeenCalledOnce()
		})
	})
})
