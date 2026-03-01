import type { Operator } from './constants/Operator'
import type { PuzzleMode } from './constants/PuzzleMode'
import type { PuzzlePart } from './PuzzlePart'

export type Puzzle = {
	parts: PuzzlePart[]
	timeout: boolean
	duration: number
	isCorrect: boolean | undefined
	operator: Operator
	operatorLabel: string
	puzzleMode?: PuzzleMode
	unknownPuzzlePart: number
}
