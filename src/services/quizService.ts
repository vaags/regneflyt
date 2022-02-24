import type { Quiz } from '../models/Quiz'
import { Operator } from '../models/constants/Operator'
import { PuzzleMode } from '../models/constants/PuzzleMode'
import { QuizState } from '../models/constants/QuizState'
import type { OperatorSettings } from '../models/OperatorSettings'
import type { NumberRange } from '../models/NumberRange'
import { AppSettings } from '../models/constants/AppSettings'

const customDifficultyId = 0

export function getQuiz(urlParams: URLSearchParams): Quiz {
	const showSettings = getBoolParam('showSettings', urlParams)
	let difficulty = getIntParam('difficulty', urlParams)

	if (!showSettings && !difficulty) {
		difficulty = customDifficultyId // For backwards compatibility. (Previously there was only custom difficulty.)
	}

	return {
		title: getStringParam('title', urlParams),
		showSettings: showSettings,
		duration: getFloatParam('duration', urlParams) ?? 0.5,
		puzzleTimeLimit: !!getIntParam('timeLimit', urlParams), // Saved as int for backwards compatibility
		difficulty: difficulty,
		operatorSettings: [
			{
				operator: Operator.Addition,
				range: {
					min: getIntParam('addMin', urlParams) ?? 1,
					max: getIntParam('addMax', urlParams) ?? 20
				},
				possibleValues: [],
				score: 0
			},
			{
				operator: Operator.Subtraction,
				range: {
					min: getIntParam('subMin', urlParams) ?? 1,
					max: getIntParam('subMax', urlParams) ?? 20
				},
				possibleValues: [],
				score: 0
			},
			{
				operator: Operator.Multiplication,
				range: {
					min: 0,
					max: 0
				},
				possibleValues: getNumArrayParam('mulValues', urlParams) ?? [7],
				score: 0
			},
			{
				operator: Operator.Division,
				range: {
					min: 0,
					max: 0
				},
				possibleValues: getNumArrayParam('divValues', urlParams) ?? [5],
				score: 0
			}
		],
		state: QuizState.Initial,
		selectedOperator: (getIntParam('operator', urlParams) as Operator) ?? undefined,
		puzzleMode: (getIntParam('puzzleMode', urlParams) as PuzzleMode) ?? PuzzleMode.Normal,
		previousScore: undefined
	}
}

export function getQuizTitle(quiz: Quiz): string {
	return (
		quiz.title ??
		`${AppSettings.operatorLabels[quiz.selectedOperator as number]}: ${
			quiz.difficulty === customDifficultyId ? 'Egendefinert' : `Nivå ${quiz.difficulty}`
		}`
	)
}

export function getQuizDifficultySettings(quiz: Quiz, difficulty: number): Quiz {
	quiz.difficulty = difficulty

	if (quiz.selectedOperator === undefined || quiz.difficulty === customDifficultyId) return quiz

	quiz.puzzleMode = quiz.difficulty > 3 ? PuzzleMode.Random : PuzzleMode.Normal
	quiz.duration = quiz.difficulty > 2 ? 1 : 0.5
	quiz.puzzleTimeLimit = quiz.difficulty > 1

	Object.values(Operator).forEach((operator) => {
		quiz.operatorSettings[operator] = getOperatorSettings(quiz.difficulty || 0, operator)
	})

	return quiz
}

function getOperatorSettings(difficulty: number, operator: number | undefined): OperatorSettings {
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
				range: {
					min: 0,
					max: 0
				},
				possibleValues: getPossibleValues(),
				score: 0
			}
		case Operator.Division:
			return {
				operator: Operator.Division,
				range: {
					min: 0,
					max: 0
				},
				possibleValues: getPossibleValues(),
				score: 0
			}
		default:
			throw 'Cannot recognize operator'
	}

	function getAdditionRange(): NumberRange {
		switch (difficulty) {
			case 1:
				return {
					min: 1,
					max: 5
				}
			case 2:
				return {
					min: 1,
					max: 10
				}
			case 3:
				return {
					min: 10,
					max: 20
				}
			case 4:
				return {
					min: 20,
					max: 30
				}
			case 5:
				return {
					min: 30,
					max: 50
				}
			case 6:
				return {
					min: 40,
					max: 70
				}
			default:
				throw 'Invalid difficulty provided'
		}
	}

	function getSubtractionRange(): NumberRange {
		switch (difficulty) {
			case 1:
				return {
					min: 1,
					max: 10
				}
			case 2:
				return {
					min: 10,
					max: 20
				}
			case 3:
				return {
					min: 20,
					max: 30
				}
			case 4:
				return {
					min: 20,
					max: 40
				}
			case 5:
				return {
					min: 20,
					max: 50
				}
			case 6:
				return {
					min: -20,
					max: 50
				}
			default:
				throw 'Invalid difficulty provided'
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
				throw 'Invalid difficulty provided'
		}
	}
}

export function setUrlParams(quiz: Quiz, window: Window) {
	const parameters = {
		duration: quiz.duration.toString(),
		timeLimit: quiz.puzzleTimeLimit ? '3' : '0', // Saved as int for backward compatibility
		operator: quiz.selectedOperator?.toString() ?? '',
		addMin: quiz.operatorSettings[Operator.Addition].range.min?.toString(),
		addMax: quiz.operatorSettings[Operator.Addition].range.max?.toString(),
		subMin: quiz.operatorSettings[Operator.Subtraction].range.min?.toString(),
		subMax: quiz.operatorSettings[Operator.Subtraction].range.max?.toString(),
		mulValues: quiz.operatorSettings[Operator.Multiplication].possibleValues?.toString() ?? '',
		divValues: quiz.operatorSettings[3].possibleValues?.toString() ?? '',
		puzzleMode: quiz.puzzleMode.toString(),
		difficulty: quiz.difficulty?.toString() ?? ''
	}

	window.history.replaceState(null, '', `?${new URLSearchParams(parameters)}`)
}

function getIntParam(param: string, urlParams: URLSearchParams): number | undefined {
	const value = urlParams.get(param)

	return value != undefined ? parseInt(value) : undefined
}

function getStringParam(param: string, urlParams: URLSearchParams): string | undefined {
	const value = urlParams.get(param)

	return value && value !== 'undefined' ? value : undefined
}

function getFloatParam(param: string, urlParams: URLSearchParams): number {
	const value = urlParams.get(param)

	return value ? parseFloat(value) : 0
}

function getBoolParam(param: string, urlParams: URLSearchParams): boolean {
	return urlParams.get(param) === 'false' ? false : true
}

function getNumArrayParam(param: string, urlParams: URLSearchParams): Array<number> | undefined {
	const array = urlParams.get(param)

	return array && array !== 'null' ? array.split(',').map(Number) : undefined
}
