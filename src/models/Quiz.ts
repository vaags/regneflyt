import type { OperatorExtended } from './constants/Operator'
import type { PuzzleMode } from './constants/PuzzleMode'
import type { OperatorSettings } from './OperatorSettings'
import type { QuizState } from './constants/QuizState'
import type { AdaptiveSkillMap, DifficultyMode } from './AdaptiveProfile'

export type OperatorSettingsByOperator = [
	OperatorSettings,
	OperatorSettings,
	OperatorSettings,
	OperatorSettings
]

export type Quiz = {
	title: string | undefined
	duration: number
	puzzleTimeLimit: boolean
	operatorSettings: OperatorSettingsByOperator
	state: QuizState
	selectedOperator: OperatorExtended | undefined
	puzzleMode: PuzzleMode
	showSettings: boolean
	previousScore: number | undefined
	difficulty: DifficultyMode | undefined
	allowNegativeAnswers: boolean
	adaptiveSkillByOperator: AdaptiveSkillMap
}
