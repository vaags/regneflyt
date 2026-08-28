import type { QuizStats } from '#lib/models/QuizStats.ts'
import type { Puzzle } from '#lib/models/Puzzle.ts'
import { AppSettings } from '#lib/constants/AppSettings.ts'

export function getQuizStats(puzzleSet: Puzzle[]): QuizStats {
	if (puzzleSet.length === 0) {
		return { starCount: 0, correctAnswerCount: 0, correctAnswerPercentage: 0 }
	}

	const correctAnswerCount = puzzleSet.filter(
		(p) => p.isCorrect === true
	).length

	const correctAnswerPercentage = Math.round(
		(correctAnswerCount / puzzleSet.length) * 100
	)

	const starCount = puzzleSet.filter(
		(p) =>
			p.isCorrect === true &&
			p.duration <= AppSettings.regneflytThresholdSeconds
	).length

	return {
		starCount,
		correctAnswerCount,
		correctAnswerPercentage
	}
}
