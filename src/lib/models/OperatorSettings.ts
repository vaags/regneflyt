import type { Operator } from '#lib/constants/Operator.ts'

export type OperatorSettings = {
	operator: Operator
	range: [min: number, max: number]
	secondaryRange?: [min: number, max: number]
	possibleValues: number[]
}
