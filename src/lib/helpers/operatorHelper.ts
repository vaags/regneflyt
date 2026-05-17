import { Operator, OperatorExtended } from '$lib/constants/Operator'
import {
	operator_addition,
	operator_all,
	operator_division,
	operator_multiplication,
	operator_subtraction
} from '$lib/paraglide/messages.js'

/**
 * User-facing localized label for an operator.
 * Returns the full operator name (e.g., "Addition", "Subtraction").
 */
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
			throw new Error(`Unknown operator: ${String(operator)}`)
	}
}
