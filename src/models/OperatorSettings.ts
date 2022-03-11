import type { Operator } from './constants/Operator'

export type OperatorSettings = {
	operator: Operator
	range: [min: number, max: number]
	possibleValues: number[]
	score: number
}
