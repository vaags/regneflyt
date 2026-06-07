import { Operator } from '$lib/constants/Operator'
import type { OperandPair, PuzzlePartIndex } from '$lib/models/Puzzle'
import type { PuzzleConcept } from '$lib/models/PuzzleConcept'

/**
 * Categorizes a puzzle based on its parameters and assigned values.
 * Returns the primary concept and any secondary concepts.
 *
 * @param operator - The math operator (addition, subtraction, etc.)
 * @param operands - The two operands in the puzzle (not the answer)
 * @param hasCarry - Whether the puzzle requires carry (for +)
 * @param hasBorrow - Whether the puzzle requires borrow (for -)
 * @param unknownPartIndex - Unknown position; algebraic only when left/right operand is unknown
 * @param answer - The generated answer (parts[2]); used to detect negative subtraction results
 * @returns Array of concepts this puzzle targets
 */
export function categorizePuzzle(
	operator: Operator,
	operands: OperandPair,
	hasCarry: boolean,
	hasBorrow: boolean,
	unknownPartIndex: PuzzlePartIndex = 2,
	answer = 0
): PuzzleConcept[] {
	const concepts: PuzzleConcept[] = []
	const [operand1, operand2] = operands
	const isAlgebraic = unknownPartIndex === 0 || unknownPartIndex === 1

	if (operator === Operator.Addition) {
		// Addition: carry is the dominant concept when present.
		if (hasCarry) {
			concepts.push('addition-carry')
		} else {
			concepts.push('addition-basic')
		}
		if (isAlgebraic) concepts.push('addition-algebraic')
	} else if (operator === Operator.Subtraction) {
		// Subtraction: negative result is a qualitatively different skill
		if (answer < 0) {
			concepts.push('subtraction-negative')
		} else {
			if (hasBorrow) {
				concepts.push('subtraction-borrow')
			} else {
				concepts.push('subtraction-basic')
			}
		}
		if (isAlgebraic) concepts.push('subtraction-algebraic')
	} else if (operator === Operator.Multiplication) {
		// Multiplication: categorize by the largest factor (adaptive tables go up to 14)
		const maxFactor = Math.max(operand1, operand2)
		if (maxFactor <= 5) {
			concepts.push('multiplication-facts-1to5')
		} else if (maxFactor <= 10) {
			concepts.push('multiplication-facts-6to10')
		} else if (maxFactor <= 14) {
			concepts.push('multiplication-facts-11to14')
		} else {
			concepts.push('multiplication-multi-digit')
		}
		if (isAlgebraic) concepts.push('multiplication-algebraic')
	} else {
		// Division: categorise by the divisor (operand2 = parts[1]), which is the
		// table value the engine uses for difficulty scoring. Using the quotient
		// (the answer) caused hard-table puzzles like 84÷12=7 to be mislabelled
		// as easy "division-facts" because the quotient 7 ≤ 10, even though the
		// difficulty engine correctly scores them as hard (divisor 12, score 55).
		const divisor = Math.abs(operand2)
		if (divisor <= 10) {
			concepts.push('division-facts')
		} else {
			concepts.push('division-large-tables')
		}
		if (isAlgebraic) concepts.push('division-algebraic')
	}

	return concepts
}
