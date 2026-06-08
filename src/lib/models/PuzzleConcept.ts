/**
 * Puzzle concepts in recommended learning order.
 */
import { Operator } from '$lib/constants/Operator'
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
 * A mathematical concept or skill targeted by a puzzle.
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
 * A weakness identified from a quiz session.
 */
export type ConceptWeakness = {
	concept: PuzzleConcept
	failureCount: number
	totalAttempts: number
	accuracy: number // 0-1
	avgDuration: number
	isSystematic: boolean // true if statistically significant weakness
}

export type PuzzleConceptMetadata = {
	operator: Operator
	isAlgebraic: boolean
}

type PuzzleConceptInfo = {
	metadata: PuzzleConceptMetadata
	label: () => string
}

/**
 * Exhaustive registry for concept metadata and labels.
 */
const puzzleConceptInfo = {
	'addition-basic': {
		metadata: { operator: Operator.Addition, isAlgebraic: false },
		label: feedback_concept_addition_basic
	},
	'addition-carry': {
		metadata: { operator: Operator.Addition, isAlgebraic: false },
		label: feedback_concept_addition_carry
	},
	'addition-algebraic': {
		metadata: { operator: Operator.Addition, isAlgebraic: true },
		label: feedback_concept_addition_algebraic
	},
	'subtraction-basic': {
		metadata: { operator: Operator.Subtraction, isAlgebraic: false },
		label: feedback_concept_subtraction_basic
	},
	'subtraction-borrow': {
		metadata: { operator: Operator.Subtraction, isAlgebraic: false },
		label: feedback_concept_subtraction_borrow
	},
	'subtraction-negative': {
		metadata: { operator: Operator.Subtraction, isAlgebraic: false },
		label: feedback_concept_subtraction_negative
	},
	'subtraction-algebraic': {
		metadata: { operator: Operator.Subtraction, isAlgebraic: true },
		label: feedback_concept_subtraction_algebraic
	},
	'multiplication-facts-1to5': {
		metadata: { operator: Operator.Multiplication, isAlgebraic: false },
		label: feedback_concept_multiplication_facts_1to5
	},
	'multiplication-facts-6to10': {
		metadata: { operator: Operator.Multiplication, isAlgebraic: false },
		label: feedback_concept_multiplication_facts_6to10
	},
	'multiplication-facts-11to14': {
		metadata: { operator: Operator.Multiplication, isAlgebraic: false },
		label: feedback_concept_multiplication_facts_11to14
	},
	'multiplication-multi-digit': {
		metadata: { operator: Operator.Multiplication, isAlgebraic: false },
		label: feedback_concept_multiplication_multi_digit
	},
	'multiplication-algebraic': {
		metadata: { operator: Operator.Multiplication, isAlgebraic: true },
		label: feedback_concept_multiplication_algebraic
	},
	'division-facts': {
		metadata: { operator: Operator.Division, isAlgebraic: false },
		label: feedback_concept_division_facts
	},
	'division-large-tables': {
		metadata: { operator: Operator.Division, isAlgebraic: false },
		label: feedback_concept_division_large_tables
	},
	'division-algebraic': {
		metadata: { operator: Operator.Division, isAlgebraic: true },
		label: feedback_concept_division_algebraic
	}
} satisfies Record<PuzzleConcept, PuzzleConceptInfo>

export function getPuzzleConceptMetadata(
	concept: PuzzleConcept
): PuzzleConceptMetadata {
	return puzzleConceptInfo[concept].metadata
}

/**
 * Localized user-facing label for a puzzle concept.
 */
export function conceptLabel(concept: PuzzleConcept): string {
	return puzzleConceptInfo[concept].label()
}
