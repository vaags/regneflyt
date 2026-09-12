import { regneflytThresholdSeconds } from '#lib/domain/quiz/quizScoring.ts'
import type { PreviewSimulationOutcome } from '#lib/models/PreviewSimulation.ts'
import { Operator, OperatorExtended } from '#lib/domain/arithmetic/operator.ts'
import type { Quiz } from '#lib/domain/quiz/quiz.ts'
import type { Puzzle } from '#lib/domain/puzzle-generation/puzzle.ts'
import { applySkillUpdate } from '#lib/domain/skill-progression/skillProgression.ts'
import { getPuzzle } from '#lib/domain/puzzle-generation/puzzleGenerator.ts'
import type { Rng } from '#lib/domain/puzzle-generation/random.ts'

export type QuizMenuValidation = {
	hasInvalidAdditionRange: boolean
	hasInvalidSubtractionRange: boolean
	hasMissingMultiplicationValues: boolean
	hasMissingDivisionValues: boolean
	hasError: boolean
}

export function getQuizMenuValidation(
	quiz: Quiz,
	isAllOperators: boolean
): QuizMenuValidation {
	const rangeIsValid = (range: [min: number, max: number]): boolean =>
		range[0] < range[1]

	const hasInvalidAdditionRange = !rangeIsValid(
		quiz.operatorSettings[Operator.Addition].range
	)
	const hasInvalidSubtractionRange = !rangeIsValid(
		quiz.operatorSettings[Operator.Subtraction].range
	)
	const hasInvalidRange = hasInvalidAdditionRange || hasInvalidSubtractionRange

	const hasMissingMultiplicationValues =
		quiz.operatorSettings[Operator.Multiplication].possibleValues.length === 0
	const hasMissingDivisionValues =
		quiz.operatorSettings[Operator.Division].possibleValues.length === 0

	const missingPossibleValues =
		(quiz.selectedOperator === Operator.Multiplication ||
			quiz.selectedOperator === Operator.Division ||
			isAllOperators) &&
		(hasMissingMultiplicationValues || hasMissingDivisionValues)

	return {
		hasInvalidAdditionRange,
		hasInvalidSubtractionRange,
		hasMissingMultiplicationValues,
		hasMissingDivisionValues,
		hasError:
			missingPossibleValues ||
			hasInvalidRange ||
			quiz.selectedOperator === undefined
	}
}

export function buildQuizMenuSettingsKey(quiz: Quiz): string {
	return JSON.stringify([
		quiz.selectedOperator,
		quiz.puzzleMode,
		quiz.allowNegativeAnswers,
		quiz.operatorSettings,
		quiz.difficulty
	])
}

export function buildQuizMenuUrlSyncKey(
	quizSettingsKey: string,
	quiz: Pick<Quiz, 'duration' | 'showPuzzleProgressBar'>
): string {
	return JSON.stringify([
		quizSettingsKey,
		quiz.duration,
		quiz.showPuzzleProgressBar
	])
}

type ResolveNextQuizPreviewInput = {
	quiz: Quiz
	previewRng: Rng
	currentPuzzle: Puzzle | undefined
	lastPreviewGeneratedAt: number | undefined
	simulatedOutcome: PreviewSimulationOutcome | undefined
	now?: () => number
}

type NextQuizPreviewState = {
	puzzle: Puzzle
	generatedAt: number
}

export function resolveNextQuizPreviewState({
	quiz,
	previewRng,
	currentPuzzle,
	lastPreviewGeneratedAt,
	simulatedOutcome,
	now = Date.now
}: ResolveNextQuizPreviewInput): NextQuizPreviewState {
	const generatedAt = now()

	if (simulatedOutcome !== undefined && currentPuzzle !== undefined) {
		const intervalSeconds =
			lastPreviewGeneratedAt === undefined
				? regneflytThresholdSeconds
				: (generatedAt - lastPreviewGeneratedAt) / 1000

		applySkillUpdate(
			quiz.skillByOperator,
			currentPuzzle.operator,
			currentPuzzle.parts,
			simulatedOutcome === 'correct',
			intervalSeconds
		)
	}

	return {
		puzzle: getPuzzle(previewRng, quiz, currentPuzzle ? [currentPuzzle] : []),
		generatedAt
	}
}

export function isAllOperatorsSelected(quiz: Quiz): boolean {
	return quiz.selectedOperator === OperatorExtended.All
}
