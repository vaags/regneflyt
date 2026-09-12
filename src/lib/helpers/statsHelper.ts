import type { QuizStats } from '#lib/models/QuizStats.ts'
import type { Puzzle } from '#lib/domain/puzzle-generation/puzzle.ts'
import { regneflytThresholdSeconds } from '#lib/domain/quiz/quizScoring.ts'

export function hasRegneflytStar(
	puzzle: Pick<Puzzle, 'isCorrect' | 'duration'>
): boolean {
	return (
		puzzle.isCorrect === true && puzzle.duration <= regneflytThresholdSeconds
	)
}

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

	const starCount = puzzleSet.filter(hasRegneflytStar).length

	return {
		starCount,
		correctAnswerCount,
		correctAnswerPercentage
	}
}
