import type { ConceptWeakness } from '$lib/models/PuzzleConcept'
import { getPuzzleConceptAction } from '$lib/models/PuzzleConcept'
import { conceptLabel } from '$lib/models/PuzzleConcept'
import {
	feedback_next_focus,
	feedback_accuracy
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
	// eslint-disable-next-line @typescript-eslint/prefer-optional-chain -- `!weakness?.isSystematic` would introduce a nullable boolean rejected by strict-boolean-expressions
	if (!weakness || !weakness.isSystematic) {
		return null
	}

	const accuracyPercent = Math.round(weakness.accuracy * 100)
	const totalAttempts = weakness.totalAttempts

	const conceptName = conceptLabel(weakness.concept)

	const actionItem = getPuzzleConceptAction(weakness.concept)

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
