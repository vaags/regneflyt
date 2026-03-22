import type { QuizStats } from '$lib/models/QuizStats'
import { conceptStatsToTuples } from '$lib/models/QuizStats'
import type { Puzzle } from '$lib/models/Puzzle'
import { AppSettings } from '$lib/constants/AppSettings'
import { buildConceptPerformanceMap } from './errorPatternHelper'

export function getQuizStats(puzzleSet: Puzzle[]): QuizStats {
	if (!puzzleSet || !puzzleSet.length) {
		return { starCount: 0, correctAnswerCount: 0, correctAnswerPercentage: 0 }
	}

	const correctAnswerCount = puzzleSet.filter((p) => p.isCorrect).length

	const correctAnswerPercentage = Math.round(
		(correctAnswerCount / puzzleSet.length) * 100
	)

	const starCount = puzzleSet.filter(
		(p) => p.isCorrect && p.duration <= AppSettings.regneflytThresholdSeconds
	).length

	// Compute per-concept performance for post-quiz feedback.
	const conceptStatsMap = buildConceptPerformanceMap(puzzleSet)
	const conceptStats = conceptStatsToTuples(conceptStatsMap)

	const result: QuizStats = {
		starCount,
		correctAnswerCount,
		correctAnswerPercentage
	}

	// Omit empty concept stats to keep persisted payload compact.
	if (conceptStats.length > 0) {
		result.conceptStats = conceptStats
	}

	return result
}
