import type { QuizStats } from '../models/QuizStats'
import type { Puzzle } from '../models/Puzzle'
import { AppSettings } from '../models/constants/AppSettings'

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

	return { starCount, correctAnswerCount, correctAnswerPercentage }
}
