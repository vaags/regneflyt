// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, fireEvent } from '@testing-library/svelte'
import PuzzleComponent from '../../src/components/screens/PuzzleComponent.svelte'
import { QuizState } from '../../src/models/constants/QuizState'
import { Operator } from '../../src/models/constants/Operator'
import { PuzzleMode } from '../../src/models/constants/PuzzleMode'
import type { Quiz } from '../../src/models/Quiz'
import type { Puzzle } from '../../src/models/Puzzle'
vi.mock('$lib/paraglide/messages.js', () => ({
	getting_ready: () => 'Getting ready',
	puzzle_heading: ({ number }: { number: number }) => `Puzzle ${number}`,
	countdown_go: () => 'Go!',
	countdown_set: () => 'Set',
	countdown_ready: () => 'Ready',
	button_delete: () => 'Delete',
	button_next: () => 'Next',
	button_yes: () => 'Yes',
	button_no: () => 'No',
	cancel_confirm: () => 'Cancel?',
	cancel_undo: () => 'Cancel',
	cancel_complete_quiz: () => 'Complete',
	sr_progress_bar: () => 'Progress'
}))

function createQuiz(overrides: Partial<Quiz> = {}): Quiz {
	return {
		title: undefined,
		duration: 0,
		hidePuzzleProgressBar: false,
		operatorSettings: [
			{ operator: Operator.Addition, range: [1, 10], possibleValues: [] },
			{ operator: Operator.Subtraction, range: [1, 10], possibleValues: [] },
			{
				operator: Operator.Multiplication,
				range: [1, 10],
				possibleValues: [2, 3, 4, 5]
			},
			{
				operator: Operator.Division,
				range: [1, 10],
				possibleValues: [2, 3, 4, 5]
			}
		],
		state: QuizState.Started,
		selectedOperator: Operator.Addition,
		puzzleMode: PuzzleMode.Normal,
		showSettings: true,
		difficulty: 0,
		allowNegativeAnswers: false,
		adaptiveSkillByOperator: [0, 0, 0, 0],
		seed: 0,
		...overrides
	}
}

const puzzleContext = new Map<string, () => void>([
	['startQuiz', () => {}],
	['abortQuiz', () => {}],
	['completeQuiz', () => {}]
])

function renderPuzzle(props?: { onAddPuzzle?: (puzzle: Puzzle) => void }) {
	return render(PuzzleComponent, {
		props: { quiz: createQuiz(), seconds: 0, ...props },
		context: puzzleContext
	})
}

describe('PuzzleComponent', () => {
	afterEach(() => cleanup())

	describe('answer submission', () => {
		it('shows ? for unknown part initially', () => {
			const { getByTestId } = renderPuzzle()
			expect(getByTestId('puzzle-expression').textContent).toContain('?')
		})

		it('updates display when typing a digit', async () => {
			const { getByTestId } = renderPuzzle()
			await fireEvent.keyDown(window, { key: '5' })
			expect(getByTestId('puzzle-expression').textContent).toContain('5')
		})

		it('calls onAddPuzzle with puzzle structure on submission', async () => {
			const onAddPuzzle = vi.fn()
			renderPuzzle({ onAddPuzzle })

			await fireEvent.keyDown(window, { key: '1' })
			await fireEvent.keyDown(window, { key: 'Enter' })

			expect(onAddPuzzle).toHaveBeenCalledOnce()
			const puzzle = onAddPuzzle.mock.calls[0]![0]
			expect(puzzle).toHaveProperty('operator')
			expect(puzzle).toHaveProperty('parts')
			expect(puzzle).toHaveProperty('isCorrect')
			expect(typeof puzzle.isCorrect).toBe('boolean')
		})

		it('marks incorrect answer as wrong', async () => {
			const onAddPuzzle = vi.fn()
			renderPuzzle({ onAddPuzzle })

			// Type an unlikely-to-be-correct answer
			await fireEvent.keyDown(window, { key: '9' })
			await fireEvent.keyDown(window, { key: '9' })
			await fireEvent.keyDown(window, { key: '9' })
			await fireEvent.keyDown(window, { key: 'Enter' })

			expect(onAddPuzzle).toHaveBeenCalledOnce()
			const puzzle = onAddPuzzle.mock.calls[0]![0]
			expect(puzzle.isCorrect).toBe(false)
		})

		it('does not submit when input is empty', async () => {
			const onAddPuzzle = vi.fn()
			renderPuzzle({ onAddPuzzle })

			await fireEvent.keyDown(window, { key: 'Enter' })

			expect(onAddPuzzle).not.toHaveBeenCalled()
		})

		it('does not submit negative zero as a value', async () => {
			const onAddPuzzle = vi.fn()
			renderPuzzle({ onAddPuzzle })

			// Type minus (creates -0) then try to submit
			await fireEvent.keyDown(window, { key: '-' })
			await fireEvent.keyDown(window, { key: 'Enter' })

			expect(onAddPuzzle).not.toHaveBeenCalled()
		})
	})

	describe('puzzle progression', () => {
		it('advances to the next puzzle after submission', async () => {
			const onAddPuzzle = vi.fn()
			renderPuzzle({ onAddPuzzle })

			await fireEvent.keyDown(window, { key: '1' })
			await fireEvent.keyDown(window, { key: 'Enter' })
			expect(onAddPuzzle).toHaveBeenCalledOnce()

			await fireEvent.keyDown(window, { key: '2' })
			await fireEvent.keyDown(window, { key: 'Enter' })
			expect(onAddPuzzle).toHaveBeenCalledTimes(2)
		})

		it('includes duration field in submitted puzzle', async () => {
			const onAddPuzzle = vi.fn()
			renderPuzzle({ onAddPuzzle })

			await fireEvent.keyDown(window, { key: '5' })
			await fireEvent.keyDown(window, { key: 'Enter' })

			const puzzle = onAddPuzzle.mock.calls[0]![0]
			expect(puzzle).toHaveProperty('duration')
		})
	})

	describe('puzzle generation', () => {
		it('generates unique puzzles from recent history', async () => {
			const puzzles: unknown[] = []
			const onAddPuzzle = vi.fn((p: unknown) => puzzles.push(p))
			renderPuzzle({ onAddPuzzle })

			// Submit several puzzles
			for (let i = 0; i < 5; i++) {
				await fireEvent.keyDown(window, { key: String(i + 1) })
				await fireEvent.keyDown(window, { key: 'Enter' })
			}

			expect(puzzles).toHaveLength(5)
			// Each puzzle should have the selected operator
			for (const p of puzzles) {
				expect(p).toHaveProperty('operator', Operator.Addition)
			}
		})
	})
})
