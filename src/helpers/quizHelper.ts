import type { Quiz } from '../models/Quiz'
import { Operator } from '../models/constants/Operator'
import { PuzzleMode } from '../models/constants/PuzzleMode'
import { QuizState } from '../models/constants/QuizState'
import type { OperatorSettings } from '../models/OperatorSettings'
import { AppSettings } from '../models/constants/AppSettings'
import { replaceState } from '$app/navigation'

const customDifficultyId = 0
const operators = [
	Operator.Addition,
	Operator.Subtraction,
	Operator.Multiplication,
	Operator.Division
] as const
let urlSyncRetryTimeout: number | undefined

function syncUrlWithRetry(nextUrl: string, retriesLeft = 20) {
	try {
		replaceState(nextUrl, {})
	} catch {
		if (retriesLeft <= 0) return
		urlSyncRetryTimeout = window.setTimeout(
			() => syncUrlWithRetry(nextUrl, retriesLeft - 1),
			50
		)
	}
}

export function getQuiz(urlParams: URLSearchParams): Quiz {
	return {
		title: getStringParam('title', urlParams),
		showSettings: getBoolParam('showSettings', urlParams),
		duration: getFloatParam('duration', urlParams) ?? 0.5,
		puzzleTimeLimit: !!getIntParam('timeLimit', urlParams), // Saved as int for backwards compatibility
		difficulty: getIntParam('difficulty', urlParams),
		allowNegativeAnswers:
			getIntParam('difficulty', urlParams) === 1
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
			(getIntParam('puzzleMode', urlParams) as PuzzleMode) ?? PuzzleMode.Normal,
		previousScore: undefined
	}
}

export function getQuizTitle(quiz: Quiz): string {
	return (
		quiz.title ??
		`${AppSettings.operatorLabels[quiz.selectedOperator as number]}: ${
			quiz.difficulty === customDifficultyId
				? 'Egendefinert'
				: `Nivå ${quiz.difficulty}`
		}`
	)
}

export function getQuizDifficultySettings(
	quiz: Quiz,
	difficulty: number,
	previousDifficulty?: number
): Quiz {
	const selectedDifficulty = difficulty

	const nextQuiz: Quiz = {
		...quiz,
		difficulty: selectedDifficulty,
		duration: quiz.duration === 0 ? 0.5 : quiz.duration,
		allowNegativeAnswers:
			selectedDifficulty > 1 ||
			(selectedDifficulty === 0 && previousDifficulty !== 1)
	}

	if (
		nextQuiz.selectedOperator === undefined ||
		selectedDifficulty === customDifficultyId
	)
		return nextQuiz

	nextQuiz.puzzleMode =
		selectedDifficulty > 3 ? PuzzleMode.Random : PuzzleMode.Normal

	const operatorSettings = [...nextQuiz.operatorSettings]
	for (const operator of operators) {
		operatorSettings[operator] = getOperatorSettings(selectedDifficulty, operator)
	}
	nextQuiz.operatorSettings = operatorSettings

	return nextQuiz
}

function getOperatorSettings(
	difficulty: number,
	operator: number | undefined
): OperatorSettings {
	switch (operator) {
		case Operator.Addition:
			return {
				operator: Operator.Addition,
				range: getAdditionRange(),
				possibleValues: [],
				score: 0
			}
		case Operator.Subtraction:
			return {
				operator: Operator.Subtraction,
				range: getSubtractionRange(),
				possibleValues: [],
				score: 0
			}
		case Operator.Multiplication:
			return {
				operator: Operator.Multiplication,
				range: [0, 0],
				possibleValues: getPossibleValues(),
				score: 0
			}
		case Operator.Division:
			return {
				operator: Operator.Division,
				range: [0, 0],
				possibleValues: getPossibleValues(),
				score: 0
			}
		default:
			throw new Error('Cannot recognize operator')
	}

	function getAdditionRange(): [min: number, max: number] {
		switch (difficulty) {
			case 1:
				return [1, 5]
			case 2:
				return [1, 10]
			case 3:
				return [10, 20]
			case 4:
				return [10, 20]
			case 5:
				return [20, 30]
			case 6:
				return [30, 50]
			default:
				throw new Error('Invalid difficulty provided')
		}
	}

	function getSubtractionRange(): [min: number, max: number] {
		switch (difficulty) {
			case 1:
				return [1, 10]
			case 2:
				return [10, 20]
			case 3:
				return [20, 30]
			case 4:
				return [20, 30]
			case 5:
				return [20, 40]
			case 6:
				return [20, 50]
			default:
				throw new Error('Invalid difficulty provided')
		}
	}

	function getPossibleValues(): number[] {
		switch (difficulty) {
			case 1:
				return [1, 2]
			case 2:
				return [3, 5]
			case 3:
				return [6, 4, 10]
			case 4:
				return [7, 9, 11]
			case 5:
				return [12, 8, 6]
			case 6:
				return [12, 8, 7, 9]
			default:
				throw new Error('Invalid difficulty provided')
		}
	}
}

export function setUrlParams(quiz: Quiz) {
	const parameters = {
		duration: quiz.duration.toString(),
		timeLimit: quiz.puzzleTimeLimit ? '3' : '0', // Saved as int for backward compatibility
		operator: quiz.selectedOperator?.toString() ?? '',
		addMin: quiz.operatorSettings[Operator.Addition].range[0]?.toString(),
		addMax: quiz.operatorSettings[Operator.Addition].range[1]?.toString(),
		subMin: quiz.operatorSettings[Operator.Subtraction].range[0]?.toString(),
		subMax: quiz.operatorSettings[Operator.Subtraction].range[1]?.toString(),
		mulValues:
			quiz.operatorSettings[
				Operator.Multiplication
			].possibleValues?.toString() ?? '',
		divValues: quiz.operatorSettings[3].possibleValues?.toString() ?? '',
		puzzleMode: quiz.puzzleMode.toString(),
		difficulty: quiz.difficulty?.toString() ?? '',
		allowNegativeAnswers: quiz.allowNegativeAnswers.toString()
	}
	const nextUrl = `?${new URLSearchParams(parameters)}`

	if (urlSyncRetryTimeout) window.clearTimeout(urlSyncRetryTimeout)
	syncUrlWithRetry(nextUrl)
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

function getFloatParam(param: string, urlParams: URLSearchParams): number {
	const value = urlParams.get(param)

	return value ? parseFloat(value) : 0
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
