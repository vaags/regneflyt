import {
	operator_addition,
	operator_all,
	operator_division,
	operator_multiplication,
	operator_subtraction
} from '$lib/paraglide/messages.js'

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
	return operatorSigns[operator]
}

export function getOperatorLabel(operator: OperatorExtended): string {
	switch (operator) {
		case Operator.Addition:
			return operator_addition()
		case Operator.Subtraction:
			return operator_subtraction()
		case Operator.Multiplication:
			return operator_multiplication()
		case Operator.Division:
			return operator_division()
		case OperatorExtended.All:
			return operator_all()
		default:
			throw new Error(`Unknown operator: ${operator}`)
	}
}
