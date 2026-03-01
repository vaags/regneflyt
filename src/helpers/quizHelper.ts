import type { Quiz } from '../models/Quiz'
import { Operator, OperatorExtended } from '../models/constants/Operator'
import { PuzzleMode } from '../models/constants/PuzzleMode'
import { QuizState } from '../models/constants/QuizState'
import { AppSettings } from '../models/constants/AppSettings'
import {
	adaptiveDifficultyId,
	customAdaptiveDifficultyId,
	defaultAdaptiveSkillMap,
	normalizeDifficulty,
	type DifficultyMode
} from '../models/AdaptiveProfile'

const minQuizDurationMinutes = 0.5
const maxQuizDurationMinutes = 480
const minMultiplicationDivisionTable = 1
const maxMultiplicationDivisionTable = 12

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
		1,
		100
	)
	const subtractionRange = getValidatedRangeFromParams(
		urlParams,
		'subMin',
		'subMax',
		1,
		20,
		-40,
		50
	)

	return {
		title: getStringParam('title', urlParams),
		showSettings: getBoolParam('showSettings', urlParams),
		duration: getValidatedDuration(getFloatParam('duration', urlParams)),
		puzzleTimeLimit: !!getIntParam('timeLimit', urlParams), // Saved as int for backwards compatibility
		difficulty: normalizedDifficulty,
		allowNegativeAnswers: getAllowNegativeAnswersForMode(
			normalizedDifficulty,
			urlParams
		),
		operatorSettings: [
			{
				operator: Operator.Addition,
				range: additionRange,
				possibleValues: [],
				score: 0
			},
			{
				operator: Operator.Subtraction,
				range: subtractionRange,
				possibleValues: [],
				score: 0
			},
			{
				operator: Operator.Multiplication,
				range: [0, 0],
				possibleValues: getValidatedTableValues(
					getNumArrayParam('mulValues', urlParams),
					[7]
				),
				score: 0
			},
			{
				operator: Operator.Division,
				range: [0, 0],
				possibleValues: getValidatedTableValues(
					getNumArrayParam('divValues', urlParams),
					[5]
				),
				score: 0
			}
		],
		state: QuizState.Initial,
		selectedOperator: getOperatorExtendedParam('operator', urlParams),
		puzzleMode:
			normalizedDifficulty === adaptiveDifficultyId
				? PuzzleMode.Normal
				: (parsedPuzzleMode ?? PuzzleMode.Normal),
		previousScore: undefined,
		adaptiveSkillByOperator: [...defaultAdaptiveSkillMap]
	}
}

export function getQuizTitle(quiz: Quiz): string {
	const operatorLabel =
		quiz.selectedOperator !== undefined
			? AppSettings.operatorLabels[quiz.selectedOperator]
			: 'Regneart'

	return (
		quiz.title ??
		`${operatorLabel}: ${
			quiz.difficulty === customAdaptiveDifficultyId
				? 'Egendefinert adaptiv'
				: 'Adaptiv'
		}`
	)
}

export function getQuizDifficultySettings(
	quiz: Quiz,
	difficulty: DifficultyMode
): Quiz {
	const selectedDifficulty = getDifficultyModeFromParam(difficulty)

	return {
		...quiz,
		difficulty: selectedDifficulty,
		duration: quiz.duration === 0 ? minQuizDurationMinutes : quiz.duration,
		allowNegativeAnswers:
			selectedDifficulty === adaptiveDifficultyId
				? true
				: quiz.allowNegativeAnswers,
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
	if (difficultyMode === adaptiveDifficultyId) return true

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

function getBoolParam(param: string, urlParams: URLSearchParams): boolean {
	return urlParams.get(param) !== 'false'
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
