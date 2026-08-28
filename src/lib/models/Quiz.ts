import type { OperatorExtended } from '#lib/constants/Operator.ts'
import type { PuzzleMode } from '#lib/constants/PuzzleMode.ts'
import type { OperatorSettings } from './OperatorSettings'
import type { QuizState } from '#lib/constants/QuizState.ts'
import type { DifficultyMode, AdaptiveSkillMap } from './AdaptiveProfile'

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
	adaptiveSkillByOperator: AdaptiveSkillMap
	seed: number
}
