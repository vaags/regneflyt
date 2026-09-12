import type { OperatorExtended } from '#lib/domain/arithmetic/operator.ts'
import type { PuzzleMode } from '#lib/domain/puzzle-generation/puzzleMode.ts'
import type { OperatorSettings } from './operatorSettings'
import type { QuizState } from '#lib/domain/quiz/quizState.ts'
import type { DifficultyMode } from '../skill-progression/difficultyMode.ts'
import type { OperatorSkillMap } from '../skill-progression/skillModel.ts'

export type OperatorSettingsByOperator = [
	addition: OperatorSettings,
	subtraction: OperatorSettings,
	multiplication: OperatorSettings,
	division: OperatorSettings
]

export type Quiz = {
	duration: number
	showPuzzleProgressBar: boolean
	operatorSettings: OperatorSettingsByOperator
	state: QuizState
	selectedOperator: OperatorExtended | undefined
	puzzleMode: PuzzleMode
	difficulty: DifficultyMode | undefined
	allowNegativeAnswers: boolean
	skillByOperator: OperatorSkillMap
	seed: number
}
