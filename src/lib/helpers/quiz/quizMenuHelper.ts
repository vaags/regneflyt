import { AppSettings } from '$lib/constants/AppSettings'
import type { PreviewSimulationOutcome } from '$lib/constants/PreviewSimulation'
import { Operator, OperatorExtended } from '$lib/constants/Operator'
import type { Quiz } from '$lib/models/Quiz'
import type { Puzzle } from '$lib/models/Puzzle'
import { applySkillUpdate } from '$lib/helpers/adaptiveHelper'
import { getPuzzle } from '$lib/helpers/puzzleHelper'
import type { Rng } from '$lib/helpers/rng'

export type QuizMenuValidation = {
	hasInvalidAdditionRange: boolean
	hasInvalidSubtractionRange: boolean
	hasError: boolean
}

export function getQuizMenuValidation(
	quiz: Quiz,
	isAllOperators: boolean
): QuizMenuValidation {
	const rangeIsValid = (range: [min: number, max: number]) =>
		range[0] < range[1]

	const hasInvalidAdditionRange = !rangeIsValid(
		quiz.operatorSettings[Operator.Addition].range
	)
	const hasInvalidSubtractionRange = !rangeIsValid(
		quiz.operatorSettings[Operator.Subtraction].range
	)
	const hasInvalidRange = hasInvalidAdditionRange || hasInvalidSubtractionRange

	const missingPossibleValues =
		(quiz.selectedOperator === Operator.Multiplication ||
			quiz.selectedOperator === Operator.Division ||
			isAllOperators) &&
		(quiz.operatorSettings[Operator.Multiplication].possibleValues.length ===
			0 ||
			quiz.operatorSettings[Operator.Division].possibleValues.length === 0)

	return {
		hasInvalidAdditionRange,
		hasInvalidSubtractionRange,
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
				? AppSettings.regneflytThresholdSeconds
				: (generatedAt - lastPreviewGeneratedAt) / 1000

		applySkillUpdate(
			quiz.adaptiveSkillByOperator,
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
