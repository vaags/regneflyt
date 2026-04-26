import { Operator } from '$lib/constants/Operator'
import { PuzzleMode } from '$lib/constants/PuzzleMode'

/**
 * All puzzle concepts sorted by recommended learning order.
 * Single source of truth for all concepts in the system.
 * Use this constant instead of duplicating the list across modules.
 */
export const ALL_PUZZLE_CONCEPTS = [
	'addition-basic', // single-digit addition, normal mode
	'addition-carry', // requires carry
	'addition-algebraic', // Alternate/Random mode: find missing addend
	'subtraction-basic', // no borrowing, non-negative result
	'subtraction-borrow', // requires borrow
	'subtraction-negative', // result is negative (skill ≥ 60)
	'subtraction-algebraic', // Alternate/Random mode: find missing number
	'multiplication-facts-1to5', // 1-5 times tables
	'multiplication-facts-6to10', // 6-10 times tables
	'multiplication-facts-11to14', // 11-14 times tables (adaptive max)
	'multiplication-multi-digit', // custom settings with very large operands
	'multiplication-algebraic', // Alternate/Random mode: find missing factor
	'division-facts', // divisor/quotient ≤ 10
	'division-large-tables', // quotient 11-14 (matches adaptive table range)
	'division-algebraic' // Alternate/Random mode: find missing number
] as const

/**
 * Represents a specific mathematical concept or skill that a puzzle targets.
 * Derived from ALL_PUZZLE_CONCEPTS to ensure type and constant stay synchronized.
 * Used to categorize puzzles for error pattern analysis and targeted remediation.
 */
export type PuzzleConcept = (typeof ALL_PUZZLE_CONCEPTS)[number]

/**
 * Performance data for a specific concept within a quiz session.
 */
export type ConceptPerformance = {
	correct: number
	total: number
	avgDuration: number // average seconds per attempt
}

/**
 * Represents a weakness identified from a quiz session.
 * A weakness is systematic if it involves multiple attempts with <60% accuracy.
 */
export type ConceptWeakness = {
	concept: PuzzleConcept
	failureCount: number
	totalAttempts: number
	accuracy: number // 0-1
	avgDuration: number
	isSystematic: boolean // true if statistically significant weakness
}

/**
 * Categorizes a puzzle based on its parameters and assigned values.
 * Returns the primary concept and any secondary concepts.
 *
 * @param operator - The math operator (addition, subtraction, etc.)
 * @param operands - The two operands in the puzzle (not the answer)
 * @param hasCarry - Whether the puzzle requires carry (for +)
 * @param hasBorrow - Whether the puzzle requires borrow (for -)
 * @param puzzleMode - Normal, Alternate, or Random (affects algebraic tagging)
 * @param answer - The generated answer (parts[2]); used to detect negative subtraction results
 * @returns Array of concepts this puzzle targets
 */
export function categorizePuzzle(
	operator: Operator,
	operands: [number, number],
	hasCarry: boolean,
	hasBorrow: boolean,
	puzzleMode: PuzzleMode = PuzzleMode.Normal,
	answer = 0
): PuzzleConcept[] {
	const concepts: PuzzleConcept[] = []
	const [operand1, operand2] = operands
	const isAlgebraic = puzzleMode !== PuzzleMode.Normal

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

import {
	feedback_concept_addition_basic,
	feedback_concept_addition_carry,
	feedback_concept_addition_algebraic,
	feedback_concept_subtraction_basic,
	feedback_concept_subtraction_borrow,
	feedback_concept_subtraction_negative,
	feedback_concept_subtraction_algebraic,
	feedback_concept_multiplication_facts_1to5,
	feedback_concept_multiplication_facts_6to10,
	feedback_concept_multiplication_facts_11to14,
	feedback_concept_multiplication_multi_digit,
	feedback_concept_multiplication_algebraic,
	feedback_concept_division_facts,
	feedback_concept_division_large_tables,
	feedback_concept_division_algebraic
} from '$lib/paraglide/messages.js'

/**
 * Maps each puzzle concept to its user-facing label function.
 */
const conceptLabelMap: Record<PuzzleConcept, () => string> = {
	'addition-basic': feedback_concept_addition_basic,
	'addition-carry': feedback_concept_addition_carry,
	'addition-algebraic': feedback_concept_addition_algebraic,
	'subtraction-basic': feedback_concept_subtraction_basic,
	'subtraction-borrow': feedback_concept_subtraction_borrow,
	'subtraction-negative': feedback_concept_subtraction_negative,
	'subtraction-algebraic': feedback_concept_subtraction_algebraic,
	'multiplication-facts-1to5': feedback_concept_multiplication_facts_1to5,
	'multiplication-facts-6to10': feedback_concept_multiplication_facts_6to10,
	'multiplication-facts-11to14': feedback_concept_multiplication_facts_11to14,
	'multiplication-multi-digit': feedback_concept_multiplication_multi_digit,
	'multiplication-algebraic': feedback_concept_multiplication_algebraic,
	'division-facts': feedback_concept_division_facts,
	'division-large-tables': feedback_concept_division_large_tables,
	'division-algebraic': feedback_concept_division_algebraic
}

/**
 * User-facing label for a puzzle concept, fully localized via paraglide.
 */
export function conceptLabel(concept: PuzzleConcept): string {
	return conceptLabelMap[concept]()
}
