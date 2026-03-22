import type { ConceptWeakness, PuzzleConcept } from '$lib/models/PuzzleConcept'
import { conceptLabel } from '$lib/models/PuzzleConcept'
import {
	feedback_next_focus,
	feedback_accuracy,
	feedback_action_addition_basic,
	feedback_action_addition_carry,
	feedback_action_addition_algebraic,
	feedback_action_subtraction_basic,
	feedback_action_subtraction_borrow,
	feedback_action_subtraction_negative,
	feedback_action_subtraction_algebraic,
	feedback_action_multiplication_facts_1to5,
	feedback_action_multiplication_facts_6to10,
	feedback_action_multiplication_facts_11to14,
	feedback_action_multiplication_multi_digit,
	feedback_action_multiplication_algebraic,
	feedback_action_division_facts,
	feedback_action_division_large_tables,
	feedback_action_division_algebraic
} from '$lib/paraglide/messages.js'

/**
 * Represents a single feedback message to show to the user.
 */
export type FeedbackMessage = {
	title: string // e.g., "Next focus:"
	concept: string // e.g., "Subtraction with borrowing"
	accuracy: string // e.g., "60% accuracy"
	actionItem: string // e.g., "Work on borrowing from the tens place"
}

/**
 * Generates a single diagnostic feedback message from the top weakness.
 * Returns null if no systematic weaknesses exist.
 */
export function generateFeedbackMessage(
	weakness: ConceptWeakness | null
): FeedbackMessage | null {
	if (!weakness || !weakness.isSystematic) {
		return null
	}

	const accuracyPercent = Math.round(weakness.accuracy * 100)
	const totalAttempts = weakness.totalAttempts

	const conceptName = conceptLabel(weakness.concept)

	const actionItem = getActionItemForConcept(weakness.concept)

	return {
		title: feedback_next_focus(),
		concept: conceptName,
		accuracy: feedback_accuracy({
			percent: accuracyPercent,
			correct: weakness.totalAttempts - weakness.failureCount,
			total: totalAttempts
		}),
		actionItem
	}
}

/**
 * Maps a concept to a localized, actionable guidance message via paraglide.
 */
const actionItemByConcept: Record<PuzzleConcept, () => string> = {
	'addition-basic': feedback_action_addition_basic,
	'addition-carry': feedback_action_addition_carry,
	'addition-algebraic': feedback_action_addition_algebraic,
	'subtraction-basic': feedback_action_subtraction_basic,
	'subtraction-borrow': feedback_action_subtraction_borrow,
	'subtraction-negative': feedback_action_subtraction_negative,
	'subtraction-algebraic': feedback_action_subtraction_algebraic,
	'multiplication-facts-1to5': feedback_action_multiplication_facts_1to5,
	'multiplication-facts-6to10': feedback_action_multiplication_facts_6to10,
	'multiplication-facts-11to14': feedback_action_multiplication_facts_11to14,
	'multiplication-multi-digit': feedback_action_multiplication_multi_digit,
	'multiplication-algebraic': feedback_action_multiplication_algebraic,
	'division-facts': feedback_action_division_facts,
	'division-large-tables': feedback_action_division_large_tables,
	'division-algebraic': feedback_action_division_algebraic
}

function getActionItemForConcept(concept: PuzzleConcept): string {
	return actionItemByConcept[concept]()
}
