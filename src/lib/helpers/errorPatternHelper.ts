import type { Puzzle } from '$lib/models/Puzzle'
import {
	type ConceptPerformance,
	type ConceptWeakness,
	categorizePuzzle,
	type PuzzleConcept
} from '$lib/models/PuzzleConcept'
import { Operator } from '$lib/constants/Operator'
import { adaptiveTuning } from '$lib/models/AdaptiveProfile'

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
		// Addition requires carry if there's any digit position where sum >= 10
		const digits1 = String(operand1).split('').map(Number)
		const digits2 = String(operand2).split('').map(Number).reverse()
		digits1.reverse()

		for (let i = 0; i < Math.max(digits1.length, digits2.length); i++) {
			const d1 = digits1[i] ?? 0
			const d2 = digits2[i] ?? 0
			const sum = d1 + d2
			if (sum >= 10) {
				result.hasCarry = true
				break
			}
		}
	} else if (operator === Operator.Subtraction) {
		// Subtraction requires borrow if any digit position needs borrowing
		const digits1 = String(operand1).split('').map(Number).reverse()
		const digits2 = String(operand2).split('').map(Number).reverse()

		for (let i = 0; i < Math.min(digits1.length, digits2.length); i++) {
			const d1 = digits1[i]
			const d2 = digits2[i]
			if (d1 !== undefined && d2 !== undefined && d1 < d2) {
				result.hasBorrow = true
				break
			}
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
			const existing = map.get(concept) || {
				concept,
				correct: 0,
				total: 0,
				avgDuration: 0
			}

			const wasCorrect = puzzle.isCorrect ? 1 : 0
			const newTotal = existing.total + 1
			const newCorrect = existing.correct + wasCorrect

			// Update rolling average duration
			const newAvgDuration =
				(existing.avgDuration * existing.total + puzzle.duration) / newTotal

			map.set(concept, {
				concept,
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

	conceptStats.forEach((stats) => {
		const accuracy = stats.correct / stats.total
		const hasLowAccuracy =
			accuracy < adaptiveTuning.remediationThresholdAccuracy
		const hasMinimumAttempts =
			stats.total >= adaptiveTuning.remediationMinPuzzles
		const isSlowOrZero =
			stats.avgDuration >= adaptiveTuning.remediationSlowResponseSeconds ||
			accuracy === 0
		const hasRepeatedLowAccuracy =
			stats.total >= adaptiveTuning.remediationFastLowAccuracyMinPuzzles
		const isSystematic =
			hasLowAccuracy &&
			((hasMinimumAttempts && isSlowOrZero) || hasRepeatedLowAccuracy)

		weaknesses.push({
			concept: stats.concept,
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
	count: number = 1
): ConceptWeakness[] {
	return weaknesses
		.filter((w) => w.isSystematic)
		.sort((a, b) => a.accuracy - b.accuracy)
		.slice(0, Math.max(count, 1))
}

/**
 * Returns the highest-priority systematic weakness for a concept performance map.
 */
export function getTopSystematicWeakness(
	conceptStats: Map<PuzzleConcept, ConceptPerformance>
): ConceptWeakness | null {
	const weaknesses = analyzeWeaknesses(conceptStats)
	return getTopSystematicWeaknesses(weaknesses, 1)[0] ?? null
}
