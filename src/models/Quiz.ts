import type { OperatorExtended } from './constants/Operator'
import type { PuzzleMode } from './constants/PuzzleMode'
import type { OperatorSettings } from './OperatorSettings'
import type { QuizState } from './constants/QuizState'

export type Quiz = {
	title: string | undefined
	duration: number
	puzzleTimeLimit: boolean
	operatorSettings: OperatorSettings[]
	state: QuizState
	selectedOperator: OperatorExtended | undefined
	puzzleMode: PuzzleMode
	showSettings: boolean
	previousScore: number | undefined
	difficulty: number | undefined
	allowNegativeAnswers: boolean
}
