import type { Quiz } from '$lib/models/Quiz'
import * as m from '$lib/paraglide/messages.js'
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
	type DifficultyMode
} from '$lib/models/AdaptiveProfile'
import { normalizeDifficulty } from './adaptiveHelper'
import {
	getAdaptiveDifficultyLabel,
	getCustomDifficultyLabel
} from '$lib/constants/DifficultyLabels'
import { AppSettings } from '$lib/constants/AppSettings'

const minQuizDurationMinutes = import.meta.env.DEV ? 0.1 : 0.5
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
	const parsedDifficulty = getIntParam('difficulty', urlParams)
	const normalizedDifficulty = getDifficultyModeFromParam(parsedDifficulty)
	const parsedPuzzleMode = getPuzzleModeParam('puzzleMode', urlParams)
	const additionRange = getValidatedRangeFromParams(
		urlParams,
		'addMin',
		'addMax',
		1,
		20,
		AppSettings.additionMinRange,
		AppSettings.additionMaxRange
	)
	const subtractionRange = getValidatedRangeFromParams(
		urlParams,
		'subMin',
		'subMax',
		1,
		20,
		AppSettings.subtractionMinRange,
		AppSettings.subtractionMaxRange
	)

	const parsedSeed = getIntParam('seed', urlParams)
	const seed = parsedSeed ?? (Math.random() * 0x100000000) >>> 0

	return {
		title: getStringParam('title', urlParams),
		showSettings: getBoolParam('showSettings', urlParams),
		duration: getValidatedDuration(getFloatParam('duration', urlParams)),
		hidePuzzleProgressBar: getBoolParam('hideProgressBar', urlParams, false),
		difficulty: normalizedDifficulty,
		allowNegativeAnswers: getAllowNegativeAnswersForMode(
			normalizedDifficulty,
			urlParams
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
				possibleValues: getValidatedTableValues(
					getNumArrayParam('mulValues', urlParams),
					[7]
				)
			},
			{
				operator: Operator.Division,
				range: [0, 0],
				possibleValues: getValidatedTableValues(
					getNumArrayParam('divValues', urlParams),
					[5]
				)
			}
		],
		state: QuizState.AboutToStart,
		selectedOperator: getOperatorExtendedParam('operator', urlParams),
		puzzleMode:
			normalizedDifficulty === adaptiveDifficultyId
				? PuzzleMode.Normal
				: (parsedPuzzleMode ?? PuzzleMode.Normal),
		adaptiveSkillByOperator: [...defaultAdaptiveSkillMap],
		seed
	}
}

/**
 * Builds a human-readable title for a quiz, combining operator label
 * and difficulty mode. Falls back to a custom title if provided via URL.
 *
 * @param quiz - The quiz to generate a title for
 * @returns Display title string
 */
export function getQuizTitle(quiz: Quiz): string {
	const operatorLabel =
		quiz.selectedOperator !== undefined
			? getOperatorLabel(quiz.selectedOperator)
			: m.label_operator_fallback()

	return (
		quiz.title ??
		`${operatorLabel}: ${
			quiz.difficulty === customAdaptiveDifficultyId
				? getCustomDifficultyLabel()
				: getAdaptiveDifficultyLabel()
		}`
	)
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
	const selectedDifficulty = getDifficultyModeFromParam(difficulty)

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

function getDifficultyModeFromParam(
	difficultyParam: number | undefined
): DifficultyMode {
	// Backward compatibility: historical URLs used multiple numeric levels (1-6).
	// In the adaptive redesign only two modes exist:
	// - 0 => custom adaptive
	// - any other value (or missing) => adaptive
	return normalizeDifficulty(difficultyParam)
}

function getAllowNegativeAnswersForMode(
	difficultyMode: DifficultyMode,
	urlParams: URLSearchParams
): boolean {
	// Adaptive mode: negative answers are skill-gated per puzzle in puzzleHelper.
	if (difficultyMode === adaptiveDifficultyId) return false

	return getBoolParam('allowNegativeAnswers', urlParams)
}

function getIntParam(
	param: string,
	urlParams: URLSearchParams
): number | undefined {
	const value = urlParams.get(param)
	if (value === null) return undefined

	const parsed = Number.parseInt(value, 10)
	return Number.isNaN(parsed) ? undefined : parsed
}

function getPuzzleModeParam(
	param: string,
	urlParams: URLSearchParams
): PuzzleMode | undefined {
	const value = getIntParam(param, urlParams)

	if (value === undefined) return undefined

	return isPuzzleMode(value) ? value : undefined
}

function getOperatorExtendedParam(
	param: string,
	urlParams: URLSearchParams
): OperatorExtended | undefined {
	const value = getIntParam(param, urlParams)

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

function getStringParam(
	param: string,
	urlParams: URLSearchParams
): string | undefined {
	const value = urlParams.get(param)

	return value && value !== 'undefined' ? value : undefined
}

function getFloatParam(
	param: string,
	urlParams: URLSearchParams
): number | undefined {
	const value = urlParams.get(param)
	if (value === null) return undefined

	const parsed = Number.parseFloat(value)
	return Number.isNaN(parsed) ? undefined : parsed
}

function getBoolParam(
	param: string,
	urlParams: URLSearchParams,
	defaultValue = true
): boolean {
	const value = urlParams.get(param)
	if (value === null) return defaultValue
	return value !== 'false'
}

function getNumArrayParam(
	param: string,
	urlParams: URLSearchParams
): Array<number> | undefined {
	const array = urlParams.get(param)

	return array && array !== 'null' ? array.split(',').map(Number) : undefined
}

function getValidatedDuration(duration: number | undefined): number {
	if (duration === undefined || Number.isNaN(duration))
		return minQuizDurationMinutes

	if (duration === 0) return 0

	return clampNumber(duration, minQuizDurationMinutes, maxQuizDurationMinutes)
}

function getValidatedRangeFromParams(
	urlParams: URLSearchParams,
	minParam: string,
	maxParam: string,
	defaultMin: number,
	defaultMax: number,
	allowedMin: number,
	allowedMax: number
): [number, number] {
	const parsedMin = getIntParam(minParam, urlParams) ?? defaultMin
	const parsedMax = getIntParam(maxParam, urlParams) ?? defaultMax

	const boundedMin = clampNumber(parsedMin, allowedMin, allowedMax)
	const boundedMax = clampNumber(parsedMax, allowedMin, allowedMax)

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

function clampNumber(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value))
}
