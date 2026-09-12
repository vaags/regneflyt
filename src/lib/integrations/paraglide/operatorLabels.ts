import {
	operator_addition,
	operator_all,
	operator_division,
	operator_multiplication,
	operator_subtraction
} from '#lib/paraglide/messages.js'
import {
	Operator,
	OperatorExtended,
	isOperatorExtended
} from '#lib/domain/arithmetic/operator.ts'

const operatorLabels = {
	[Operator.Addition]: () => operator_addition(),
	[Operator.Subtraction]: () => operator_subtraction(),
	[Operator.Multiplication]: () => operator_multiplication(),
	[Operator.Division]: () => operator_division(),
	[OperatorExtended.All]: () => operator_all()
} satisfies Record<OperatorExtended, () => string>

export function getOperatorLabel(operator: OperatorExtended): string {
	if (!isOperatorExtended(operator)) {
		throw new Error(`Unknown operator: ${String(operator)}`)
	}

	return operatorLabels[operator]()
}
