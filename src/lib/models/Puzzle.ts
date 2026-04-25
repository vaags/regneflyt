import type { Operator } from '$lib/constants/Operator'
import type { PuzzleMode } from '$lib/constants/PuzzleMode'
import type { OperatorSettings } from './OperatorSettings'

export type PuzzlePart = {
	generatedValue: number
	userDefinedValue: number | undefined
}

export type PuzzlePartSet = [
	leftOperand: PuzzlePart,
	rightOperand: PuzzlePart,
	result: PuzzlePart
]
export type PuzzlePartIndex = 0 | 1 | 2

export type Puzzle = {
	parts: PuzzlePartSet
	duration: number
	isCorrect: boolean | undefined
	operator: Operator
	puzzleMode?: PuzzleMode
	unknownPartIndex: PuzzlePartIndex
	operatorSettings?: OperatorSettings
}
