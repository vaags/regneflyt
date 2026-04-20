// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte'
import { Operator } from '$lib/constants/Operator'
import { PuzzleMode } from '$lib/constants/PuzzleMode'
import { toast_validation_error } from '$lib/paraglide/messages.js'
import { dismissToast } from '$lib/stores'
import { createTestQuiz } from './component-setup'
import MenuViewWithGlobalToastHarness from './mocks/MenuViewWithGlobalToastHarness.svelte'
import type { Rng } from '$lib/helpers/rng'
import type { Puzzle } from '$lib/models/Puzzle'
import type { Quiz } from '$lib/models/Quiz'

const { mockGetPuzzle } = vi.hoisted(() => ({
	mockGetPuzzle: vi.fn(
		(_: Rng, quiz: Quiz, _recentPuzzles: Puzzle[]): Puzzle => {
			const operator =
				quiz.selectedOperator === Operator.Subtraction ||
				quiz.selectedOperator === Operator.Multiplication ||
				quiz.selectedOperator === Operator.Division
					? quiz.selectedOperator
					: Operator.Addition

			return {
				parts: [
					{ generatedValue: 4, userDefinedValue: undefined },
					{ generatedValue: 5, userDefinedValue: undefined },
					{ generatedValue: 9, userDefinedValue: undefined }
				],
				duration: 0,
				isCorrect: undefined,
				operator,
				puzzleMode: PuzzleMode.Normal,
				unknownPartIndex: 2,
				operatorSettings: {
					operator,
					range: [1, 10],
					possibleValues: []
				}
			}
		}
	)
}))

vi.mock('$lib/helpers/puzzleHelper', async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>()

	return {
		...actual,
		getPuzzle: (rng: Rng, quiz: Quiz, recentPuzzles: Puzzle[] = []) =>
			mockGetPuzzle(rng, quiz, recentPuzzles)
	}
})

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

	it('regenerates preview only for puzzle-affecting settings', async () => {
		const quiz = createTestQuiz({
			duration: 0,
			showPuzzleProgressBar: true
		})

		const { container, getByTestId } = render(MenuViewWithGlobalToastHarness, {
			props: { quiz }
		})

		await waitFor(() => {
			expect(mockGetPuzzle).toHaveBeenCalled()
		})

		const previewCallsAfterMount = mockGetPuzzle.mock.calls.length

		const oneMinuteOption = container.querySelector<HTMLInputElement>(
			'input[name="duration"][value="1"]'
		)
		expect(oneMinuteOption).toBeTruthy()
		await fireEvent.click(oneMinuteOption!)

		const progressBarToggle = container.querySelector<HTMLInputElement>(
			'input[type="checkbox"]'
		)
		expect(progressBarToggle).toBeTruthy()
		await fireEvent.click(progressBarToggle!)

		await waitFor(() => {
			expect(mockGetPuzzle).toHaveBeenCalledTimes(previewCallsAfterMount)
		})

		await fireEvent.click(getByTestId(`operator-${Operator.Subtraction}`))

		await waitFor(() => {
			expect(mockGetPuzzle.mock.calls.length).toBeGreaterThan(
				previewCallsAfterMount
			)
		})
	})
})
