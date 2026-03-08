import * as m from '$lib/paraglide/messages.js'

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

export function getOperatorLabel(operator: OperatorExtended): string {
	switch (operator) {
		case Operator.Addition:
			return m.operator_addition()
		case Operator.Subtraction:
			return m.operator_subtraction()
		case Operator.Multiplication:
			return m.operator_multiplication()
		case Operator.Division:
			return m.operator_division()
		case OperatorExtended.All:
			return m.operator_all()
		default:
			throw new Error(`Unknown operator: ${operator}`)
	}
}
