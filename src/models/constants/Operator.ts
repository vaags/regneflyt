export const Operator = {
	Addition: 0,
	Subtraction: 1,
	Multiplication: 2,
	Division: 3
} as const

export const OperatorExtended = { ...Operator, All: 4 } as const

export type Operator = (typeof Operator)[keyof typeof Operator]

export type OperatorExtended =
	(typeof OperatorExtended)[keyof typeof OperatorExtended]

export const operatorSigns = ['+', '−', '×', '÷'] as const

export type OperatorSign = (typeof operatorSigns)[number]

export function getOperatorSign(operator: Operator): OperatorSign {
	const sign = operatorSigns[operator]

	if (!sign) throw new Error('No operator sign defined')

	return sign
}
