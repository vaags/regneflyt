export const Operator = {
	Addition: 0,
	Subtraction: 1,
	Multiplication: 2,
	Division: 3
} as const

export const OperatorExtended = { ...Operator, All: 4 } as const

export type Operator = (typeof Operator)[keyof typeof Operator]

export type OperatorExtended = (typeof OperatorExtended)[keyof typeof OperatorExtended]
