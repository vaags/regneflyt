import type { Operator } from '$lib/constants/Operator'
import type { PuzzleMode } from '$lib/constants/PuzzleMode'
import type { PuzzlePart } from './PuzzlePart'
import type { OperatorSettings } from './OperatorSettings'

export type PuzzlePartSet = [PuzzlePart, PuzzlePart, PuzzlePart]
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
