import { getQuiz } from '../../src/helpers/quizHelper'
import { Operator, OperatorExtended } from '../../src/models/constants/Operator'
import { PuzzleMode } from '../../src/models/constants/PuzzleMode'
import type { Quiz } from '../../src/models/Quiz'
import type { Puzzle, PuzzlePartSet } from '../../src/models/Puzzle'

export const emptyPartSet: PuzzlePartSet = [
	{ userDefinedValue: undefined, generatedValue: 0 },
	{ userDefinedValue: undefined, generatedValue: 0 },
	{ userDefinedValue: undefined, generatedValue: 0 }
]

export function createQuiz(
	overrides: Partial<{
		operator: OperatorExtended
		difficulty: number
		puzzleMode: PuzzleMode
		puzzleTimeLimit: boolean
	}> = {}
): Quiz {
	const params = new URLSearchParams(
		`operator=${overrides.operator ?? 0}&difficulty=${overrides.difficulty ?? 1}`
	)
	const quiz = getQuiz(params)
	quiz.selectedOperator = overrides.operator ?? Operator.Addition
	quiz.puzzleMode = overrides.puzzleMode ?? PuzzleMode.Normal
	quiz.puzzleTimeLimit = overrides.puzzleTimeLimit ?? false
	return quiz
}

export function createPuzzle(
	overrides: Partial<{
		duration: number
		isCorrect: boolean
		operator: Operator
		puzzleMode: PuzzleMode
		timeout: boolean
	}> = {}
): Puzzle {
	return {
		parts: emptyPartSet,
		timeout: overrides.timeout ?? false,
		duration: overrides.duration ?? 2,
		isCorrect: overrides.isCorrect ?? true,
		operator: overrides.operator ?? Operator.Addition,
		unknownPuzzlePart: 2 as const
	}
}
