import {
	operator_addition,
	operator_subtraction,
	operator_multiplication,
	operator_division,
	operator_all
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

export type OperatorSign = '+' | '−' | '×' | '÷'

type OperatorInfo = {
	sign: OperatorSign
	label: () => string
}

/**
 * Exhaustive registry for operator metadata (signs and labels).
 */
const operatorRegistry = {
	0: {
		sign: '+' as const,
		label: operator_addition
	},
	1: {
		sign: '−' as const,
		label: operator_subtraction
	},
	2: {
		sign: '×' as const,
		label: operator_multiplication
	},
	3: {
		sign: '÷' as const,
		label: operator_division
	}
} satisfies Record<Operator, OperatorInfo>

type OperatorExtendedInfo = OperatorInfo | { sign?: never; label: () => string }

const operatorExtendedRegistry = {
	0: operatorRegistry[0],
	1: operatorRegistry[1],
	2: operatorRegistry[2],
	3: operatorRegistry[3],
	4: {
		label: operator_all
	}
} satisfies Record<OperatorExtended, OperatorExtendedInfo>

function isOperatorExtended(value: number): value is OperatorExtended {
	return Object.hasOwn(operatorExtendedRegistry, value)
}

export function getOperatorSign(operator: Operator): OperatorSign {
	return operatorRegistry[operator].sign
}

export function getOperatorLabel(operator: OperatorExtended): string {
	if (!isOperatorExtended(operator)) {
		throw new Error(`Unknown operator: ${String(operator)}`)
	}

	return operatorExtendedRegistry[operator].label()
}
