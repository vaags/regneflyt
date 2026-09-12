import type { Quiz } from '#lib/domain/quiz/quiz.ts'
import {
	difficulty_adaptive,
	difficulty_custom,
	label_operator_fallback
} from '#lib/paraglide/messages.js'
import {
	Operator,
	OperatorExtended,
	isOperatorExtended
} from '#lib/domain/arithmetic/operator.ts'
import { getOperatorLabel } from '#lib/integrations/paraglide/operatorLabels.ts'
import {
	PuzzleMode,
	isPuzzleMode
} from '#lib/domain/puzzle-generation/puzzleMode.ts'
import { QuizState } from '#lib/domain/quiz/quizState.ts'
import {
	defaultOperatorSkillMap,
	type OperatorSkillMap,
	type OperandRange
} from '#lib/domain/skill-progression/skillModel.ts'
import {
	customDifficultyId,
	type DifficultyMode
} from '#lib/domain/skill-progression/difficultyMode.ts'
import {
	parseQuizUrlQuery,
	type QuizUrlQuery
} from '#lib/models/quizQuerySchema.ts'
import {
	isAdaptiveDifficulty,
	normalizeDifficulty
} from '#lib/domain/skill-progression/difficultyMode.ts'
import { puzzleGenerationSettings } from '#lib/domain/puzzle-generation/puzzleGenerationSettings.ts'
import { getRandomUint32Seed } from '#lib/domain/puzzle-generation/seed.ts'

const defaultQuizDurationMinutes = 0.5
const minQuizDurationMinutes = import.meta.env.DEV
	? 0.1
	: defaultQuizDurationMinutes
const maxQuizDurationMinutes = 480
const minMultiplicationDivisionTable = puzzleGenerationSettings.minTable
const maxMultiplicationDivisionTable = puzzleGenerationSettings.maxTable

type QuizSeedResolver = () => number

/**
 * Parses URL search parameters into a fully initialised {@link Quiz} object.
 * Applies defaults, validates ranges, and normalises the difficulty mode.
 *
 * @param urlParams - The URL search parameters to parse
 * @returns A quiz object ready for the state machine
 */
export function getQuiz(urlParams: URLSearchParams): Quiz {
	return getQuizFromQuery(parseQuizUrlQuery(urlParams))
}

/**
 * Builds a quiz from a pre-parsed URL query object.
 * Useful for route `load` functions that already parse query params.
 *
 * `resolveSeed` is an optional impurity boundary. Callers can inject a deterministic
 * seed source for tests/replay diagnostics while default behavior remains unchanged.
 */
export function getQuizFromQuery(
	query: QuizUrlQuery,
	resolveSeed: QuizSeedResolver = getRandomUint32Seed
): Quiz {
	const parsedDifficulty = query.difficulty
	// Backward compat: historical URLs used numeric levels (1-6); now only 0 (custom) and 1 (adaptive) exist
	const normalizedDifficulty = normalizeDifficulty(parsedDifficulty)
	const parsedPuzzleMode = getPuzzleMode(query.puzzleMode)
	const additionRange = getValidatedRange(
		query.addMin,
		query.addMax,
		1,
		20,
		puzzleGenerationSettings.additionMinRange,
		puzzleGenerationSettings.additionMaxRange
	)
	const subtractionRange = getValidatedRange(
		query.subMin,
		query.subMax,
		1,
		20,
		puzzleGenerationSettings.subtractionMinRange,
		puzzleGenerationSettings.subtractionMaxRange
	)

	const parsedSeed = query.seed
	const seed = parsedSeed ?? resolveSeed()

	return {
		duration: getValidatedDuration(query.duration),
		showPuzzleProgressBar: query.showProgressBar,
		difficulty: normalizedDifficulty,
		allowNegativeAnswers: getAllowNegativeAnswersForMode(
			normalizedDifficulty,
			query.allowNegativeAnswers
		),
		operatorSettings: [
			{
				operator: Operator.Addition,
				range: additionRange,
				possibleValues: []
			},
			{
				operator: Operator.Subtraction,
				range: subtractionRange,
				possibleValues: []
			},
			{
				operator: Operator.Multiplication,
				range: [0, 0],
				possibleValues: getValidatedTableValues(query.mulValues, [7])
			},
			{
				operator: Operator.Division,
				range: [0, 0],
				possibleValues: getValidatedTableValues(query.divValues, [5])
			}
		],
		state: QuizState.AboutToStart,
		selectedOperator:
			getOperatorExtended(query.operator) ?? OperatorExtended.Addition,
		puzzleMode: isAdaptiveDifficulty(normalizedDifficulty)
			? PuzzleMode.Normal
			: (parsedPuzzleMode ?? PuzzleMode.Normal),
		skillByOperator: [...defaultOperatorSkillMap],
		seed
	}
}

/**
 * Convenience wrapper: parses URL params into a {@link Quiz}
 * and injects the given operator skill map.
 */
export function initQuizFromUrl(
	urlParams: URLSearchParams,
	operatorSkills: OperatorSkillMap
): Quiz {
	return initQuizFromQuery(parseQuizUrlQuery(urlParams), operatorSkills)
}

/**
 * Builds a {@link Quiz} from a pre-parsed query and
 * injects the given operator skill map.
 */
export function initQuizFromQuery(
	query: QuizUrlQuery,
	operatorSkills: OperatorSkillMap,
	resolveSeed?: QuizSeedResolver
): Quiz {
	return {
		...getQuizFromQuery(query, resolveSeed),
		skillByOperator: [...operatorSkills]
	}
}

/**
 * Builds a human-readable title for a quiz, combining operator label
 * and difficulty mode.
 *
 * @param quiz - The quiz to generate a title for
 * @returns Display title string
 */
export function getQuizTitle(quiz: Quiz): string {
	const operatorLabel =
		quiz.selectedOperator !== undefined
			? getOperatorLabel(quiz.selectedOperator)
			: label_operator_fallback()

	return `${operatorLabel}: ${
		quiz.difficulty === customDifficultyId
			? difficulty_custom()
			: difficulty_adaptive()
	}`
}

/**
 * Returns a copy of the quiz with the difficulty mode switched.
 * Resets puzzle mode to Normal when switching to adaptive.
 *
 * @param quiz - The source quiz object
 * @param difficulty - The new difficulty mode to apply
 * @returns A new quiz object with updated difficulty settings
 */
export function getQuizDifficultySettings(
	quiz: Quiz,
	difficulty: DifficultyMode
): Quiz {
	const selectedDifficulty = normalizeDifficulty(difficulty)

	return {
		...quiz,
		difficulty: selectedDifficulty,
		duration: getValidatedDuration(quiz.duration),
		allowNegativeAnswers: quiz.allowNegativeAnswers,
		puzzleMode: isAdaptiveDifficulty(selectedDifficulty)
			? PuzzleMode.Normal
			: quiz.puzzleMode
	}
}

function getAllowNegativeAnswersForMode(
	difficultyMode: DifficultyMode,
	allowNegativeAnswers: boolean
): boolean {
	// Adaptive mode: negative answers are skill-gated per puzzle in puzzleGenerator.
	if (isAdaptiveDifficulty(difficultyMode)) return false

	return allowNegativeAnswers
}

function getPuzzleMode(value: number | undefined): PuzzleMode | undefined {
	if (value === undefined) return undefined

	return isPuzzleMode(value) ? value : undefined
}

function getOperatorExtended(
	value: number | undefined
): OperatorExtended | undefined {
	if (value === undefined) return undefined

	return isOperatorExtended(value) ? value : undefined
}

function getValidatedDuration(duration: number | undefined): number {
	if (duration === undefined || Number.isNaN(duration))
		return defaultQuizDurationMinutes

	if (duration === 0) return 0

	return Math.min(
		maxQuizDurationMinutes,
		Math.max(minQuizDurationMinutes, duration)
	)
}

function getValidatedRange(
	parsedMin: number | undefined,
	parsedMax: number | undefined,
	defaultMin: number,
	defaultMax: number,
	allowedMin: number,
	allowedMax: number
): OperandRange {
	const min = parsedMin ?? defaultMin
	const max = parsedMax ?? defaultMax

	const boundedMin = Math.min(allowedMax, Math.max(allowedMin, min))
	const boundedMax = Math.min(allowedMax, Math.max(allowedMin, max))

	return boundedMin <= boundedMax
		? [boundedMin, boundedMax]
		: [boundedMax, boundedMin]
}

function getValidatedTableValues(
	tables: number[] | undefined,
	defaultValues: number[]
): number[] {
	if (!tables) return defaultValues

	const validTables = tables.filter(
		(table) =>
			Number.isInteger(table) &&
			table >= minMultiplicationDivisionTable &&
			table <= maxMultiplicationDivisionTable
	)

	return validTables.length > 0 ? validTables : defaultValues
}
