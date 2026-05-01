import { describe, expect, it } from 'vitest'
import { Operator } from '$lib/constants/Operator'
import { TimerState } from '$lib/constants/TimerState'
import type { Puzzle } from '$lib/models/Puzzle'
import {
	hasMissingPuzzleInput,
	resetReplayPuzzle,
	shouldResumeQuizTimerAfterTween,
	trimRecentPuzzleHistory
} from '$lib/helpers/quiz/puzzleViewHelper'

function createPuzzle(): Puzzle {
	return {
		parts: [
			{ generatedValue: 3, userDefinedValue: 1 },
			{ generatedValue: 4, userDefinedValue: 2 },
			{ generatedValue: 7, userDefinedValue: 3 }
		],
		unknownPartIndex: 2,
		duration: 4.2,
		isCorrect: true,
		operator: Operator.Addition
	}
}

describe('puzzleViewHelper', () => {
	describe('resetReplayPuzzle', () => {
		it('clears user values and completion metadata for replay', () => {
			const original = createPuzzle()

			const reset = resetReplayPuzzle(original)

			expect(reset).not.toBe(original)
			expect(reset.parts[0].userDefinedValue).toBeUndefined()
			expect(reset.parts[1].userDefinedValue).toBeUndefined()
			expect(reset.parts[2].userDefinedValue).toBeUndefined()
			expect(reset.duration).toBe(0)
			expect(reset.isCorrect).toBeUndefined()
			expect(reset.operator).toBe(Operator.Addition)
		})
	})

	describe('trimRecentPuzzleHistory', () => {
		it('keeps only the latest puzzles up to max history size', () => {
			const p1 = createPuzzle()
			const p2 = createPuzzle()
			const p3 = createPuzzle()

			const recent = trimRecentPuzzleHistory([p1, p2], p3, 2)

			expect(recent).toEqual([p2, p3])
		})
	})

	describe('shouldResumeQuizTimerAfterTween', () => {
		it('returns true for stopped and finished timer states', () => {
			expect(shouldResumeQuizTimerAfterTween(TimerState.Stopped)).toBe(true)
			expect(shouldResumeQuizTimerAfterTween(TimerState.Finished)).toBe(true)
		})

		it('returns false for active timer states', () => {
			expect(shouldResumeQuizTimerAfterTween(TimerState.Started)).toBe(false)
			expect(shouldResumeQuizTimerAfterTween(TimerState.Paused)).toBe(false)
			expect(shouldResumeQuizTimerAfterTween(TimerState.Resumed)).toBe(false)
		})
	})

	describe('hasMissingPuzzleInput', () => {
		it('returns true for undefined or negative zero user values', () => {
			const undefinedValuePuzzle = createPuzzle()
			undefinedValuePuzzle.parts[2].userDefinedValue = undefined

			const negativeZeroPuzzle = createPuzzle()
			negativeZeroPuzzle.parts[2].userDefinedValue = -0

			expect(hasMissingPuzzleInput(undefinedValuePuzzle)).toBe(true)
			expect(hasMissingPuzzleInput(negativeZeroPuzzle)).toBe(true)
		})

		it('returns false when the unknown part has a regular number', () => {
			const puzzle = createPuzzle()
			puzzle.parts[2].userDefinedValue = 7

			expect(hasMissingPuzzleInput(puzzle)).toBe(false)
		})
	})
})
