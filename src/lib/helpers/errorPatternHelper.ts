import type { Puzzle } from '$lib/models/Puzzle'
import type {
	ConceptPerformance,
	ConceptWeakness,
	PuzzleConcept
} from '$lib/models/PuzzleConcept'
import { categorizePuzzle } from '$lib/helpers/puzzleConceptHelper'
import { Operator } from '$lib/constants/Operator'
import { adaptiveTuning } from '$lib/models/AdaptiveProfile'
import { countCarriesOrBorrows } from '$lib/helpers/adaptiveDifficultyScoring'

/**
 * Analyzes a puzzle to detect if it requires carry (addition) or borrow (subtraction).
 */
export function detectCarryBorrow(
	operand1: number,
	operand2: number,
	operator: Operator
): { hasCarry?: boolean; hasBorrow?: boolean } {
	const result: { hasCarry?: boolean; hasBorrow?: boolean } = {}

	if (operator === Operator.Addition) {
		if (countCarriesOrBorrows(operand1, operand2, false) > 0) {
			result.hasCarry = true
		}
	} else if (operator === Operator.Subtraction) {
		if (countCarriesOrBorrows(operand1, operand2, true) > 0) {
			result.hasBorrow = true
		}
	}

	return result
}

/**
 * Builds a concept performance map from a set of puzzles.
 * Analyzes each puzzle, categorizes it, and tracks performance.
 */
export function buildConceptPerformanceMap(
	puzzles: Puzzle[]
): Map<PuzzleConcept, ConceptPerformance> {
	const map = new Map<PuzzleConcept, ConceptPerformance>()

	puzzles.forEach((puzzle) => {
		const { hasCarry, hasBorrow } = detectCarryBorrow(
			puzzle.parts[0].generatedValue,
			puzzle.parts[1].generatedValue,
			puzzle.operator
		)

		const concepts = categorizePuzzle(
			puzzle.operator,
			[puzzle.parts[0].generatedValue, puzzle.parts[1].generatedValue],
			hasCarry ?? false,
			hasBorrow ?? false,
			puzzle.puzzleMode ?? 0,
			puzzle.parts[2].generatedValue
		)

		concepts.forEach((concept) => {
			const existing = map.get(concept) ?? {
				correct: 0,
				total: 0,
				avgDuration: 0
			}

			const wasCorrect = puzzle.isCorrect === true ? 1 : 0
			const newTotal = existing.total + 1
			const newCorrect = existing.correct + wasCorrect

			// Update rolling average duration
			const newAvgDuration =
				(existing.avgDuration * existing.total + puzzle.duration) / newTotal

			map.set(concept, {
				correct: newCorrect,
				total: newTotal,
				avgDuration: newAvgDuration
			})
		})
	})

	return map
}

/**
 * Analyzes concept performance to identify systematic weaknesses.
 * A weakness is systematic if:
 * - Attempted at least N times (default 3)
 * - Accuracy < threshold (default 60%)
 * - EITHER average response time ≥ configured slow-response threshold OR accuracy = 0
 * - OR low accuracy persists across more attempts (default 5), even if responses are fast
 */
export function analyzeWeaknesses(
	conceptStats: Map<PuzzleConcept, ConceptPerformance>
): ConceptWeakness[] {
	const weaknesses: ConceptWeakness[] = []

	conceptStats.forEach((stats, concept) => {
		const accuracy = stats.correct / stats.total
		const hasLowAccuracy =
			accuracy < adaptiveTuning.remediation.thresholdAccuracy
		const hasMinimumAttempts =
			stats.total >= adaptiveTuning.remediation.minPuzzles
		const isSlowOrZero =
			stats.avgDuration >= adaptiveTuning.remediation.slowResponseSeconds ||
			accuracy === 0
		const hasRepeatedLowAccuracy =
			stats.total >= adaptiveTuning.remediation.fastLowAccuracyMinPuzzles
		const isSystematic =
			hasLowAccuracy &&
			((hasMinimumAttempts && isSlowOrZero) || hasRepeatedLowAccuracy)

		weaknesses.push({
			concept,
			failureCount: stats.total - stats.correct,
			totalAttempts: stats.total,
			accuracy,
			avgDuration: stats.avgDuration,
			isSystematic
		})
	})

	// Sort by severity: worst accuracy first
	return weaknesses.sort((a, b) => a.accuracy - b.accuracy)
}

/**
 * Extracts the top N systematic weaknesses from a list.
 * If fewer than N systematic weaknesses exist, returns all systematic ones.
 */
export function getTopSystematicWeaknesses(
	weaknesses: ConceptWeakness[],
	count = 1
): ConceptWeakness[] {
	return weaknesses
		.filter((w) => w.isSystematic)
		.sort((a, b) => a.accuracy - b.accuracy)
		.slice(0, Math.max(count, 1))
}
