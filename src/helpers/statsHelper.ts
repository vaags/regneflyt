import type { QuizStats } from '../models/QuizStats'
import type { Puzzle } from '../models/Puzzle'
import { AppSettings } from '../models/constants/AppSettings'
import type { Operator } from '../models/constants/Operator'
import type { OperatorPersonalBest, PersonalBests } from '../stores'

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

export type OperatorQuizStats = {
	accuracy: number
	avgTime: number | null
}

export function getOperatorStats(
	puzzleSet: Puzzle[],
	operator: Operator
): OperatorQuizStats {
	const puzzles = puzzleSet.filter((p) => p.operator === operator)
	if (puzzles.length === 0) return { accuracy: 0, avgTime: null }

	const correct = puzzles.filter((p) => p.isCorrect).length
	const accuracy = Math.round((correct / puzzles.length) * 100)
	const totalTime = puzzles.reduce((sum, p) => sum + p.duration, 0)
	const avgTime = Math.round((totalTime / puzzles.length) * 10) / 10

	return { accuracy, avgTime }
}

export function updatePersonalBests(
	current: PersonalBests,
	puzzleSet: Puzzle[]
): PersonalBests {
	const updated = [...current] as PersonalBests
	const operators = [0, 1, 2, 3] as Operator[]

	for (const op of operators) {
		const stats = getOperatorStats(puzzleSet, op)
		if (stats.avgTime === null) continue

		const prev = current[op] as OperatorPersonalBest
		const newBest: OperatorPersonalBest = { ...prev }

		if (stats.accuracy > prev.bestAccuracy) {
			newBest.bestAccuracy = stats.accuracy
		}

		if (
			stats.accuracy === 100 &&
			(prev.fastestAvgTime === null || stats.avgTime < prev.fastestAvgTime)
		) {
			newBest.fastestAvgTime = stats.avgTime
		}

		updated[op] = newBest
	}

	return updated
}
