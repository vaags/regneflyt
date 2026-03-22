import { describe, expect, it } from 'vitest'
import type { ConceptWeakness } from '$lib/models/PuzzleConcept'

import { generateFeedbackMessage } from '$lib/helpers/feedbackHelper'
import { conceptLabel } from '$lib/models/PuzzleConcept'
import {
	feedback_next_focus,
	feedback_accuracy,
	feedback_action_division_algebraic
} from '$lib/paraglide/messages.js'

function makeWeakness(
	overrides: Partial<ConceptWeakness> = {}
): ConceptWeakness {
	return {
		concept: 'addition-basic',
		failureCount: 2,
		totalAttempts: 5,
		accuracy: 0.6,
		avgDuration: 2,
		isSystematic: true,
		...overrides
	}
}

describe('feedbackHelper', () => {
	it('returns null for null or non-systematic weakness', () => {
		expect(generateFeedbackMessage(null)).toBeNull()
		expect(generateFeedbackMessage(makeWeakness({ isSystematic: false }))).toBe(
			null
		)
	})

	it('generates localized diagnostic message for systematic weakness', () => {
		const msg = generateFeedbackMessage(
			makeWeakness({
				concept: 'division-algebraic',
				failureCount: 3,
				totalAttempts: 4,
				accuracy: 0.25
			})
		)

		expect(msg).toEqual({
			title: feedback_next_focus(),
			concept: conceptLabel('division-algebraic'),
			accuracy: feedback_accuracy({ percent: 25, correct: 1, total: 4 }),
			actionItem: feedback_action_division_algebraic()
		})
	})
})
