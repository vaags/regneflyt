import type { ConceptPerformance, PuzzleConcept } from './PuzzleConcept'

/**
 * Serializable representation of concept performance data.
 * Stored as array of [concept, performance] tuples (Map doesn't serialize to JSON).
 */
export type ConceptPerformanceData = Array<[PuzzleConcept, ConceptPerformance]>

export type QuizStats = {
	correctAnswerCount: number
	correctAnswerPercentage: number
	starCount: number
	/**
	 * Per-concept performance tracking from this quiz session.
	 * Stored as tuples for JSON serialization.
	 */
	conceptStats?: ConceptPerformanceData
}

/**
 * Converts a Map of concept stats to a JSON-serializable array of tuples.
 */
export function conceptStatsToTuples(
	map: Map<PuzzleConcept, ConceptPerformance>
): ConceptPerformanceData {
	return Array.from(map.entries())
}

/**
 * Reconstructs a Map from serialized tuples.
 */
export function tuplesToConceptStats(
	tuples: ConceptPerformanceData
): Map<PuzzleConcept, ConceptPerformance> {
	return new Map(tuples)
}
