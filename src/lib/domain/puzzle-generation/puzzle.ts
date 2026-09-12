import type { Operator } from '#lib/domain/arithmetic/operator.ts'
import type { PuzzleMode } from '#lib/domain/puzzle-generation/puzzleMode.ts'

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

export type OperandPair = [left: number, right: number]

export type Puzzle = {
	parts: PuzzlePartSet
	duration: number
	isCorrect: boolean | undefined
	operator: Operator
	puzzleMode?: PuzzleMode
	unknownPartIndex: PuzzlePartIndex
}
