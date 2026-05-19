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
