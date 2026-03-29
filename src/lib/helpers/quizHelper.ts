import type { Quiz } from '$lib/models/Quiz'
import {
	difficulty_adaptive,
	difficulty_custom,
	label_operator_fallback
} from '$lib/paraglide/messages.js'
import {
	Operator,
	OperatorExtended,
	getOperatorLabel
} from '$lib/constants/Operator'
import { PuzzleMode } from '$lib/constants/PuzzleMode'
import { QuizState } from '$lib/constants/QuizState'
import {
	adaptiveDifficultyId,
	customAdaptiveDifficultyId,
	defaultAdaptiveSkillMap,
	type AdaptiveSkillMap,
	type DifficultyMode
} from '$lib/models/AdaptiveProfile'
import {
	parseQuizUrlQuery,
	type QuizUrlQuery
} from '$lib/models/quizQuerySchema'
import { normalizeDifficulty } from './adaptiveHelper'
import { AppSettings } from '$lib/constants/AppSettings'

const defaultQuizDurationMinutes = 0.5
const minQuizDurationMinutes = import.meta.env.DEV
	? 0.1
	: defaultQuizDurationMinutes
const maxQuizDurationMinutes = 480
const minMultiplicationDivisionTable = AppSettings.minTable
const maxMultiplicationDivisionTable = AppSettings.maxTable

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
 */
export function getQuizFromQuery(query: QuizUrlQuery): Quiz {
	const parsedDifficulty = query.difficulty
	// Backward compat: historical URLs used numeric levels (1-6); now only 0 (custom) and 1 (adaptive) exist
	const normalizedDifficulty = normalizeDifficulty(parsedDifficulty)
	const parsedPuzzleMode = getPuzzleMode(query.puzzleMode)
	const additionRange = getValidatedRange(
		query.addMin,
		query.addMax,
		1,
		20,
		AppSettings.additionMinRange,
		AppSettings.additionMaxRange
	)
	const subtractionRange = getValidatedRange(
		query.subMin,
		query.subMax,
		1,
		20,
		AppSettings.subtractionMinRange,
		AppSettings.subtractionMaxRange
	)

	const parsedSeed = query.seed
	const seed = parsedSeed ?? (Math.random() * 0x100000000) >>> 0

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
		puzzleMode:
			normalizedDifficulty === adaptiveDifficultyId
				? PuzzleMode.Normal
				: (parsedPuzzleMode ?? PuzzleMode.Normal),
		adaptiveSkillByOperator: [...defaultAdaptiveSkillMap],
		seed
	}
}

/**
 * Convenience wrapper: parses URL params into a {@link Quiz}
 * and injects the given adaptive skill map.
 */
export function initQuizFromUrl(
	urlParams: URLSearchParams,
	adaptiveSkills: AdaptiveSkillMap
): Quiz {
	return initQuizFromQuery(parseQuizUrlQuery(urlParams), adaptiveSkills)
}

/**
 * Convenience wrapper: builds a {@link Quiz} from a pre-parsed query and
 * injects the given adaptive skill map.
 */
export function initQuizFromQuery(
	query: QuizUrlQuery,
	adaptiveSkills: AdaptiveSkillMap
): Quiz {
	return {
		...getQuizFromQuery(query),
		adaptiveSkillByOperator: [...adaptiveSkills]
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
		quiz.difficulty === customAdaptiveDifficultyId
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
		puzzleMode:
			selectedDifficulty === adaptiveDifficultyId
				? PuzzleMode.Normal
				: quiz.puzzleMode
	}
}

function getAllowNegativeAnswersForMode(
	difficultyMode: DifficultyMode,
	allowNegativeAnswers: boolean
): boolean {
	// Adaptive mode: negative answers are skill-gated per puzzle in puzzleHelper.
	if (difficultyMode === adaptiveDifficultyId) return false

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

function isPuzzleMode(value: number): value is PuzzleMode {
	return (
		value === PuzzleMode.Normal ||
		value === PuzzleMode.Alternate ||
		value === PuzzleMode.Random
	)
}

function isOperatorExtended(value: number): value is OperatorExtended {
	return (
		value === Operator.Addition ||
		value === Operator.Subtraction ||
		value === Operator.Multiplication ||
		value === Operator.Division ||
		value === OperatorExtended.All
	)
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
): [number, number] {
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
