import type { Quiz } from '../models/Quiz'
import { Operator, OperatorExtended } from '../models/constants/Operator'
import type { Puzzle, PuzzlePartIndex, PuzzlePartSet } from '../models/Puzzle'
import { PuzzleMode } from '../models/constants/PuzzleMode'
import type { OperatorSettings } from '../models/OperatorSettings'
import {
	adaptiveDifficultyId,
	adaptiveTuning,
	getAdaptivePuzzleMode,
	getAdaptiveSettingsForOperator,
	normalizeDifficulty,
	type AdaptiveSkillMap,
	type AdaptiveDifficulty
} from '../models/AdaptiveProfile'

export function getPuzzle(
	quiz: Quiz,
	previousPuzzle: Puzzle | undefined = undefined
): Puzzle {
	const normalizedDifficulty = normalizeDifficulty(quiz.difficulty)
	const activeOperator: Operator = resolveOperator(
		quiz.selectedOperator,
		normalizedDifficulty,
		quiz.adaptiveSkillByOperator
	)
	const effectivePuzzleMode = resolveEffectivePuzzleMode(
		quiz,
		activeOperator,
		normalizedDifficulty,
		previousPuzzle
	)
	const operatorSettings = resolveAdaptiveOperatorSettings(
		quiz,
		activeOperator,
		normalizedDifficulty
	)

	return {
		parts: getPuzzleParts(
			operatorSettings,
			previousPuzzle?.parts,
			quiz.allowNegativeAnswers
		),
		operator: activeOperator,
		timeout: false,
		duration: 0,
		isCorrect: undefined,
		puzzleMode: effectivePuzzleMode,
		unknownPuzzlePart: getUnknownPuzzlePartNumber(
			activeOperator,
			effectivePuzzleMode
		)
	}
}

function resolveEffectivePuzzleMode(
	quiz: Quiz,
	activeOperator: Operator,
	normalizedDifficulty: AdaptiveDifficulty,
	previousPuzzle: Puzzle | undefined
): PuzzleMode {
	if (normalizedDifficulty !== adaptiveDifficultyId) return quiz.puzzleMode

	return getAdaptivePuzzleMode(
		quiz.adaptiveSkillByOperator[activeOperator],
		previousPuzzle?.puzzleMode ?? quiz.puzzleMode
	)
}

function resolveAdaptiveOperatorSettings(
	quiz: Quiz,
	activeOperator: Operator,
	normalizedDifficulty: AdaptiveDifficulty
): OperatorSettings {
	const baseSettings = quiz.operatorSettings[activeOperator]

	const adaptiveSettings = getAdaptiveSettingsForOperator(
		activeOperator,
		quiz.adaptiveSkillByOperator[activeOperator],
		normalizedDifficulty,
		baseSettings.range,
		baseSettings.possibleValues
	)

	return {
		...baseSettings,
		range: adaptiveSettings.range,
		possibleValues: adaptiveSettings.possibleValues
	}
}

function resolveOperator(
	operator: OperatorExtended | undefined,
	normalizedDifficulty: AdaptiveDifficulty,
	adaptiveSkillByOperator: AdaptiveSkillMap
): Operator {
	if (operator === undefined)
		throw new Error('Cannot get operator: parameter is undefined')

	if (operator !== OperatorExtended.All) return operator

	if (normalizedDifficulty !== adaptiveDifficultyId)
		return Math.floor(
			Math.random() * adaptiveTuning.adaptiveAllOperatorCount
		) as Operator

	return resolveAdaptiveAllOperator(adaptiveSkillByOperator)
}

function resolveAdaptiveAllOperator(
	adaptiveSkillByOperator: AdaptiveSkillMap
): Operator {
	const eligibleOperators = getEligibleAdaptiveAllOperators()

	return pickWeightedOperatorBySkill(eligibleOperators, adaptiveSkillByOperator)
}

function getEligibleAdaptiveAllOperators(): Operator[] {
	return [
		Operator.Addition,
		Operator.Subtraction,
		Operator.Multiplication,
		Operator.Division
	]
}

function pickWeightedOperatorBySkill(
	operators: Operator[],
	adaptiveSkillByOperator: AdaptiveSkillMap
): Operator {
	if (operators.length === 0)
		throw new Error('Cannot pick weighted operator: no operators provided')

	const weights = operators.map((operator) =>
		Math.max(
			1,
			adaptiveTuning.adaptiveAllWeightBase - adaptiveSkillByOperator[operator]
		)
	)
	const totalWeight = weights.reduce((total, weight) => total + weight, 0)
	let randomWeight = Math.random() * totalWeight

	for (let index = 0; index < operators.length; index++) {
		const weight = weights[index]
		const operator = operators[index]

		if (weight === undefined || operator === undefined) continue

		randomWeight -= weight
		if (randomWeight <= 0) return operator
	}

	const lastOperator = operators[operators.length - 1]
	if (lastOperator === undefined)
		throw new Error('Cannot pick weighted operator: no operators provided')

	return lastOperator
}

function getPuzzleParts(
	settings: OperatorSettings,
	previousParts: PuzzlePartSet | undefined,
	allowNegativeAnswers: boolean
): PuzzlePartSet {
	const parts: PuzzlePartSet = Array.from({ length: 3 }, () => ({
		userDefinedValue: undefined,
		generatedValue: 0
	})) as PuzzlePartSet

	switch (settings.operator) {
		case Operator.Addition:
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
				parts[0].generatedValue + parts[1].generatedValue
			break

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

			if (
				!allowNegativeAnswers &&
				parts[1].generatedValue > parts[0].generatedValue
			) {
				// Unngå negative svar, dersom laveste vanskelighetsgrad
				;[parts[0].generatedValue, parts[1].generatedValue] = [
					parts[1].generatedValue,
					parts[0].generatedValue
				]
			}

			parts[2].generatedValue =
				parts[0].generatedValue - parts[1].generatedValue
			break

		case Operator.Multiplication:
			parts[0].generatedValue = getRandomNumberFromArray(
				settings.possibleValues,
				previousParts?.[0].generatedValue
			)
			parts[1].generatedValue = getRandomNumber(
				1,
				10,
				previousParts?.[1].generatedValue
			)
			parts[2].generatedValue =
				parts[0].generatedValue * parts[1].generatedValue
			break

		case Operator.Division:
			parts[0].generatedValue = getRandomNumber(
				1,
				10,
				getInitialDivisionPartValue(previousParts)
			)
			parts[1].generatedValue = getRandomNumberFromArray(
				settings.possibleValues,
				previousParts?.[1].generatedValue
			)
			parts[0].generatedValue =
				parts[0].generatedValue * parts[1].generatedValue
			parts[2].generatedValue =
				parts[0].generatedValue / parts[1].generatedValue
			break

		default:
			throw new Error('Cannot get puzzleParts: Operator not recognized')
	}

	return parts
}

function getInitialDivisionPartValue(puzzleParts: PuzzlePartSet | undefined) {
	if (!puzzleParts) return undefined

	return puzzleParts[0].generatedValue / puzzleParts[1].generatedValue
}

function getRandomNumberFromArray(
	numbers: number[],
	previousNumber: number | undefined
): number {
	if (numbers.length === 0)
		throw new Error('Cannot get random number: empty array provided')

	if (numbers.length === 1) return numbers[0] as number

	const previousIndex =
		previousNumber !== undefined ? numbers.indexOf(previousNumber) : -1
	let rndIndex
	do {
		rndIndex = Math.floor(Math.random() * numbers.length)
	} while (rndIndex === previousIndex)

	return numbers[rndIndex] as number
}

function getRandomNumber(
	min: number,
	max: number,
	exclude: number | undefined = undefined
): number {
	if (max <= min) return min

	let rnd
	do {
		rnd = Math.floor(Math.random() * (max - min + 1)) + min
	} while (rnd === exclude)
	return rnd
}

function getUnknownPuzzlePartNumber(
	operator: Operator,
	puzzleMode: PuzzleMode
): PuzzlePartIndex {
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
