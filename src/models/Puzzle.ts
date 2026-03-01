import type { Operator } from './constants/Operator'
import type { PuzzleMode } from './constants/PuzzleMode'
import type { PuzzlePart } from './PuzzlePart'

export type PuzzlePartSet = [PuzzlePart, PuzzlePart, PuzzlePart]
export type PuzzlePartIndex = 0 | 1 | 2

export type Puzzle = {
	parts: PuzzlePartSet
	timeout: boolean
	duration: number
	isCorrect: boolean | undefined
	operator: Operator
	puzzleMode?: PuzzleMode
	unknownPuzzlePart: PuzzlePartIndex
}
