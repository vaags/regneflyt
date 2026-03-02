import type { OperatorSettings } from '../models/OperatorSettings'
import { Operator, OperatorExtended } from '../models/constants/Operator'
import { PuzzleMode } from '../models/constants/PuzzleMode'
import type { Quiz } from '../models/Quiz'
import type { QuizScores } from '../models/QuizScores'
import type { Puzzle } from '../models/Puzzle'
import { assertNever, invariant } from './assertions'

const rangeSizeScoreMultiplier = 1.5

const tableBaseScores = [
	10, // 1
	20, // 2
	30, // 3
	30, // 4
	20, // 5
	40, // 6
	50, // 7
	50, // 8
	40, // 9
	10, // 10
	20, // 11
	60 // 12
]

export function getQuizScoreSum(quiz: Quiz, puzzleSet: Puzzle[]): QuizScores {
	const quizScores: QuizScores = {
		totalScore: 0,
		correctAnswerCount: 0,
		correctAnswerPercentage: 0
	}

	if (!puzzleSet || !puzzleSet.length) return quizScores

	setTotalScore()
	setCorrectAnswerCountAndPercentage()

	return quizScores

	function setTotalScore() {
		const allOperatorsMultiplier =
			quiz.selectedOperator === OperatorExtended.All
				? allOperatorsScoreMultiplier
				: 1
		const fallbackScoreSettings = getOperatorScoreSettings(quiz)

		quizScores.totalScore = Math.round(
			puzzleSet
				.map((p) =>
					getPuzzleScore(
						p,
						fallbackScoreSettings,
						allOperatorsMultiplier,
						quiz.puzzleTimeLimit,
						quiz.puzzleMode
					)
				)
				.reduce((total, puzzleScore) => total + puzzleScore)
		)
	}

	function setCorrectAnswerCountAndPercentage() {
		quizScores.correctAnswerCount = puzzleSet
			.map((p) => p.isCorrect)
			.filter(Boolean).length

		quizScores.correctAnswerPercentage = Math.round(
			(quizScores.correctAnswerCount / puzzleSet.length) * 100
		)
	}
}

function getPuzzleScore(
	puzzle: Puzzle,
	fallbackScoreSettings: OperatorSettings[],
	allOperatorsMultiplier: number,
	puzzleTimeLimit: boolean,
	fallbackPuzzleMode: PuzzleMode
) {
	let baseScore: number

	if (puzzle.operatorSettings) {
		baseScore =
			getOperatorScore(puzzle.operatorSettings) * allOperatorsMultiplier
	} else {
		const scoreSetting = fallbackScoreSettings[puzzle.operator]
		invariant(
			scoreSetting,
			'Cannot get puzzle score: missing operator score setting'
		)
		baseScore = scoreSetting.score
	}

	const puzzleModeMultiplier = getPuzzleModeMultiplier(
		puzzle.puzzleMode ?? fallbackPuzzleMode
	)
	const operatorScore = baseScore * puzzleModeMultiplier

	if (puzzle.isCorrect) {
		const speedMultiplier = getSpeedMultiplier(puzzle.duration)
		const score = operatorScore * speedMultiplier
		return puzzleTimeLimit ? score * 2 : score
	} else {
		return puzzleTimeLimit ? operatorScore * 2 * -1 : operatorScore * -1
	}
}

const allOperatorsScoreMultiplier = 1.5

function getOperatorScoreSettings(quiz: Quiz): OperatorSettings[] {
	const allOperatorsMultiplier =
		quiz.selectedOperator === OperatorExtended.All
			? allOperatorsScoreMultiplier
			: 1

	return quiz.operatorSettings.map((settings) => ({
		...settings,
		score: getOperatorScore(settings) * allOperatorsMultiplier
	}))
}

function getOperatorScore(settings: OperatorSettings): number {
	switch (settings.operator) {
		case Operator.Addition:
		case Operator.Subtraction:
			return Math.max(
				10,
				Math.round(
					(settings.range[1] - settings.range[0]) * rangeSizeScoreMultiplier
				)
			)
		case Operator.Multiplication:
		case Operator.Division:
			return getTableScoreAverage(settings.possibleValues)
		default:
			return assertNever(settings.operator, 'Cannot get score: operator')
	}
}

function getPuzzleModeMultiplier(puzzleMode: PuzzleMode) {
	switch (puzzleMode) {
		case PuzzleMode.Normal:
			return 1
		case PuzzleMode.Alternate:
			return 1.5
		case PuzzleMode.Random:
			return 2
		default:
			return assertNever(
				puzzleMode,
				'Cannot get puzzleMode multiplier: puzzle mode'
			)
	}
}

const speedBonusMaxSeconds = 12

function getSpeedMultiplier(durationSeconds: number): number {
	const clamped = Math.max(0, Math.min(speedBonusMaxSeconds, durationSeconds))
	return 1 + (speedBonusMaxSeconds - clamped) / speedBonusMaxSeconds
}

// Uses average so that selecting more tables doesn't unfairly inflate the score.
function getTableScoreAverage(tables: number[]): number {
	invariant(
		tables.length > 0,
		'Cannot calculate multiplication/division table score: tables array must contain at least one value.'
	)
	const total = tables
		.map((tableNumber) => {
			const tableScore = tableBaseScores[tableNumber - 1]

			invariant(
				tableScore !== undefined,
				`Cannot calculate multiplication/division table score: invalid table value ${tableNumber}. Expected 1-12.`
			)

			return tableScore
		})
		.reduce((sum, score) => sum + score, 0)
	return Math.round(total / tables.length)
}
