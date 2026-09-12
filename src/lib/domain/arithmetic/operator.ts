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

type OperatorFamily = 'addSub' | 'mulDiv'

type OperatorInfo = {
	sign: OperatorSign
	family: OperatorFamily
}

/**
 * Exhaustive registry for framework-neutral operator metadata.
 */
const operatorRegistry = {
	0: {
		sign: '+' as const,
		family: 'addSub'
	},
	1: {
		sign: '−' as const,
		family: 'addSub'
	},
	2: {
		sign: '×' as const,
		family: 'mulDiv'
	},
	3: {
		sign: '÷' as const,
		family: 'mulDiv'
	}
} satisfies Record<Operator, OperatorInfo>

const operatorExtendedRegistry = {
	0: operatorRegistry[0],
	1: operatorRegistry[1],
	2: operatorRegistry[2],
	3: operatorRegistry[3],
	4: null
} satisfies Record<OperatorExtended, OperatorInfo | null>

export function isOperatorExtended(value: number): value is OperatorExtended {
	return Object.hasOwn(operatorExtendedRegistry, value)
}

export function isAddSubOperator(operator: Operator): boolean {
	return operatorRegistry[operator].family === 'addSub'
}

export function getOperatorSign(operator: Operator): OperatorSign {
	return operatorRegistry[operator].sign
}
