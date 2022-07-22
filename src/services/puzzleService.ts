import type { Quiz } from '../models/Quiz'
import { Operator, OperatorExtended } from '../models/constants/Operator'
import type { Puzzle } from '../models/Puzzle'
import type { PuzzlePart } from '../models/PuzzlePart'
import { PuzzleMode } from '../models/constants/PuzzleMode'
import type { OperatorSettings } from '../models/OperatorSettings'

export function getPuzzle(
	quiz: Quiz,
	operatorSigns: readonly string[],
	previousPuzzle: Puzzle | undefined = undefined
): Puzzle {
	const activeOperator: Operator = getOperator(quiz.selectedOperator)

	return {
		parts: getPuzzleParts(quiz.operatorSettings[activeOperator], previousPuzzle?.parts),
		operator: activeOperator,
		operatorLabel: operatorSigns[activeOperator],
		timeout: false,
		duration: 0,
		isCorrect: undefined,
		unknownPuzzlePart: getUnknownPuzzlePartNumber(activeOperator, quiz.puzzleMode)
	}
}

function getOperator(operator: OperatorExtended | undefined): Operator {
	if (operator === undefined) throw 'Cannot get operator: parameter is undefined'

	return operator === 4 ? ((Math.ceil(Math.random() * 4) - 1) as Operator) : operator
}

function getPuzzleParts(
	settings: OperatorSettings,
	previousParts: PuzzlePart[] | undefined
): PuzzlePart[] {
	const parts: PuzzlePart[] = Array.from({ length: 3 }, () => ({
		userDefinedValue: undefined,
		generatedValue: 0
	}))

	switch (settings.operator) {
		case Operator.Addition:
		case Operator.Subtraction:
			parts[0].generatedValue = getRandomNumber(
				settings.range[0],
				settings.range[1],
				previousParts?.[0].generatedValue
			)

			parts[1].generatedValue = getRandomNumber(
				settings.range[0],
				settings.range[1],
				previousParts?.[1].generatedValue
			)

			parts[2].generatedValue =
				settings.operator == Operator.Addition
					? parts[0].generatedValue + parts[1].generatedValue
					: parts[0].generatedValue - parts[1].generatedValue

			break
		case Operator.Multiplication:
			parts[0].generatedValue = getRandomNumberFromArray(
				settings.possibleValues,
				previousParts?.[0].generatedValue
			)
			parts[1].generatedValue = getRandomNumber(1, 10, previousParts?.[1].generatedValue)
			parts[2].generatedValue = parts[0].generatedValue * parts[1].generatedValue
			break
		case Operator.Division:
			parts[0].generatedValue = getRandomNumber(1, 10, getInitialDivisionPartValue(previousParts))
			parts[1].generatedValue = getRandomNumberFromArray(
				settings.possibleValues,
				previousParts?.[1].generatedValue
			)
			parts[0].generatedValue = parts[0].generatedValue * parts[1].generatedValue
			parts[2].generatedValue = parts[0].generatedValue / parts[1].generatedValue
			break
		default:
			throw 'Cannot get puzzleParts: Operator not recognized'
	}

	return parts
}

function getInitialDivisionPartValue(puzzleParts: PuzzlePart[] | undefined) {
	if (!puzzleParts || puzzleParts.length === 0) return undefined

	return puzzleParts[0].generatedValue / puzzleParts[1].generatedValue
}

function getRandomNumberFromArray(numbers: number[], previousNumber: number | undefined): number {
	if (numbers.length === 1) return numbers[0]

	const previousIndex = previousNumber ? numbers.indexOf(previousNumber) : undefined

	return numbers[getRandomNumber(0, numbers.length - 1, previousIndex)]
}

function getRandomNumber(min: number, max: number, exclude: number | undefined = undefined) {
	// Adapted from https://stackoverflow.com/a/59735724 and https://stackoverflow.com/a/34184614
	let rnd = (Math.floor(Math.pow(10, 14) * Math.random() * Math.random()) % (max - min)) + min;
	if (exclude && rnd >= exclude) rnd++

	return rnd

}

function getUnknownPuzzlePartNumber(operator: Operator, puzzleMode: PuzzleMode): number {
	switch (puzzleMode) {
		case PuzzleMode.Random:
			return getTrueOrFalse() ? getAlternateUnknownPuzzlePart(operator) : 2
		case PuzzleMode.Alternate:
			return getAlternateUnknownPuzzlePart(operator)
		case PuzzleMode.Normal:
		default:
			return 2
	}
}

function getAlternateUnknownPuzzlePart(operator: Operator) {
	switch (operator) {
		case Operator.Addition:
		case Operator.Subtraction:
			return getTrueOrFalse() ? 0 : 1
		case Operator.Multiplication:
			return 1
		case Operator.Division:
			return 0
		default:
			throw new Error('No operator defined')
	}
}

function getTrueOrFalse() {
	// Stolen from https://stackoverflow.com/a/36756480
	return Math.random() >= 0.5
}
