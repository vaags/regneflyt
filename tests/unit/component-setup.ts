import { Operator } from '$lib/constants/Operator'
import { PuzzleMode } from '$lib/constants/PuzzleMode'
import { QuizState } from '$lib/constants/QuizState'
import type { Quiz } from '$lib/models/Quiz'
import { vi } from 'vitest'

export function createTestQuiz(overrides: Partial<Quiz> = {}): Quiz {
	return {
		duration: 0,
		showPuzzleProgressBar: true,
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
		difficulty: 0,
		allowNegativeAnswers: false,
		adaptiveSkillByOperator: [0, 0, 0, 0],
		seed: 0,
		...overrides
	}
}

if (
	typeof Element !== 'undefined' &&
	typeof Element.prototype.animate !== 'function'
) {
	Element.prototype.animate = function () {
		return {
			cancel: () => {},
			finish: () => {},
			pause: () => {},
			play: () => {},
			reverse: () => {},
			onfinish: null,
			finished: Promise.resolve()
		} as unknown as Animation
	}
}

if (typeof window !== 'undefined') {
	if (typeof window.ResizeObserver === 'undefined') {
		window.ResizeObserver = class ResizeObserver {
			observe() {}
			unobserve() {}
			disconnect() {}
		}
	}

	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn()
		}))
	})
}
