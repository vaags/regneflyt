import type { Quiz } from '../models/Quiz'
import { Operator } from '../models/constants/Operator'
import { PuzzleMode } from '../models/constants/PuzzleMode'
import { QuizState } from '../models/constants/QuizState'
import { AppSettings } from '../models/constants/AppSettings'
import {
	adaptiveDifficultyId,
	customAdaptiveDifficultyId,
	defaultAdaptiveSkillMap,
	normalizeDifficulty
} from '../models/AdaptiveProfile'

export function getQuiz(urlParams: URLSearchParams): Quiz {
	const parsedDifficulty = getIntParam('difficulty', urlParams)
	const normalizedDifficulty = normalizeDifficulty(parsedDifficulty)
	const parsedPuzzleMode =
		(getIntParam('puzzleMode', urlParams) as PuzzleMode) ?? PuzzleMode.Normal

	return {
		title: getStringParam('title', urlParams),
		showSettings: getBoolParam('showSettings', urlParams),
		duration: getFloatParam('duration', urlParams) ?? 0.5,
		puzzleTimeLimit: !!getIntParam('timeLimit', urlParams), // Saved as int for backwards compatibility
		difficulty: normalizedDifficulty,
		allowNegativeAnswers:
			parsedDifficulty === 1
				? false
				: getBoolParam('allowNegativeAnswers', urlParams),
		operatorSettings: [
			{
				operator: Operator.Addition,
				range: [
					getIntParam('addMin', urlParams) ?? 1,
					getIntParam('addMax', urlParams) ?? 20
				],
				possibleValues: [],
				score: 0
			},
			{
				operator: Operator.Subtraction,
				range: [
					getIntParam('subMin', urlParams) ?? 1,
					getIntParam('subMax', urlParams) ?? 20
				],
				possibleValues: [],
				score: 0
			},
			{
				operator: Operator.Multiplication,
				range: [0, 0],
				possibleValues: getNumArrayParam('mulValues', urlParams) ?? [7],
				score: 0
			},
			{
				operator: Operator.Division,
				range: [0, 0],
				possibleValues: getNumArrayParam('divValues', urlParams) ?? [5],
				score: 0
			}
		],
		state: QuizState.Initial,
		selectedOperator:
			(getIntParam('operator', urlParams) as Operator) ?? undefined,
		puzzleMode:
			normalizedDifficulty === adaptiveDifficultyId
				? PuzzleMode.Normal
				: parsedPuzzleMode,
		previousScore: undefined,
		adaptiveSkillByOperator: [...defaultAdaptiveSkillMap]
	}
}

export function getQuizTitle(quiz: Quiz): string {
	return (
		quiz.title ??
		`${AppSettings.operatorLabels[quiz.selectedOperator as number]}: ${
			quiz.difficulty === customAdaptiveDifficultyId
				? 'Egendefinert adaptiv'
				: 'Adaptiv'
		}`
	)
}

export function getQuizDifficultySettings(
	quiz: Quiz,
	difficulty: number
): Quiz {
	const selectedDifficulty = normalizeDifficulty(difficulty)

	return {
		...quiz,
		difficulty: selectedDifficulty,
		duration: quiz.duration === 0 ? 0.5 : quiz.duration,
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

function getIntParam(
	param: string,
	urlParams: URLSearchParams
): number | undefined {
	const value = urlParams.get(param)

	return value != undefined ? parseInt(value) : undefined
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

	return value ? parseFloat(value) : undefined
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
