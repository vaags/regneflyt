import type { OperatorExtended } from '$lib/constants/Operator'
import type { Puzzle } from './Puzzle'
import type { PuzzleMode } from '$lib/constants/PuzzleMode'
import type { OperatorSettings } from './OperatorSettings'
import type { QuizState } from '$lib/constants/QuizState'
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
	showPuzzleProgressBar: boolean
	operatorSettings: OperatorSettingsByOperator
	state: QuizState
	selectedOperator: OperatorExtended | undefined
	puzzleMode: PuzzleMode
	difficulty: DifficultyMode | undefined
	allowNegativeAnswers: boolean
	adaptiveSkillByOperator: AdaptiveSkillMap
	seed: number
	replayPuzzles?: Puzzle[]
}
