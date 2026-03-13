import type { Quiz } from '../models/Quiz'
import { Operator, OperatorExtended } from '../models/constants/Operator'
import type { Puzzle, PuzzlePartIndex, PuzzlePartSet } from '../models/Puzzle'
import { PuzzleMode } from '../models/constants/PuzzleMode'
import type { OperatorSettings } from '../models/OperatorSettings'
import {
	adaptiveDifficultyId,
	adaptiveTuning,
	type AdaptiveSkillMap,
	type AdaptiveDifficulty
} from '../models/AdaptiveProfile'
import {
	getAdaptivePuzzleMode,
	getAdaptiveSettingsForOperator,
	getPuzzleDifficulty,
	normalizeDifficulty
} from './adaptiveHelper'
import { assertNever, invariant } from './assertions'

/**
 * Generates the next puzzle for a running quiz.
 * Resolves the active operator (weighted random for "All" mode),
 * determines the effective puzzle mode and difficulty via the adaptive system,
 * and produces puzzle parts that avoid repeating recent puzzles.
 *
 * @param quiz - Current quiz state including settings and skill levels
 * @param recentPuzzles - Recent puzzles used to avoid repetition
 * @returns A new {@link Puzzle} ready for display
 */
export function getPuzzle(quiz: Quiz, recentPuzzles: Puzzle[] = []): Puzzle {
	const normalizedDifficulty = normalizeDifficulty(quiz.difficulty)
	const activeOperator: Operator = resolveOperator(
		quiz.selectedOperator,
		normalizedDifficulty,
		quiz.adaptiveSkillByOperator
	)

	const cooldownStepsRemaining =
		normalizedDifficulty === adaptiveDifficultyId
			? getCooldownStepsRemaining(recentPuzzles, activeOperator)
			: 0

	const effectivePuzzleMode = resolveEffectivePuzzleMode(
		quiz,
		activeOperator,
		normalizedDifficulty
	)
	const operatorSettings = resolveAdaptiveOperatorSettings(
		quiz,
		activeOperator,
		normalizedDifficulty,
		cooldownStepsRemaining
	)

	const allowNegativeAnswers =
		normalizedDifficulty === adaptiveDifficultyId
			? quiz.adaptiveSkillByOperator[Operator.Subtraction] >=
				adaptiveTuning.adaptiveNegativeAnswersThreshold
			: quiz.allowNegativeAnswers

	const preferNoCarry =
		normalizedDifficulty === adaptiveDifficultyId &&
		quiz.adaptiveSkillByOperator[activeOperator] <
			adaptiveTuning.carryBorrowSkillThreshold &&
		(activeOperator === Operator.Addition ||
			activeOperator === Operator.Subtraction)

	const recentParts = recentPuzzles.map((p) => p.parts)

	return {
		parts: getPuzzleParts(
			operatorSettings,
			recentParts,
			allowNegativeAnswers,
			preferNoCarry,
			activeOperator,
			quiz.adaptiveSkillByOperator[activeOperator]
		),
		operator: activeOperator,
		duration: 0,
		isCorrect: undefined,
		puzzleMode: effectivePuzzleMode,
		unknownPartIndex: getUnknownPuzzlePartNumber(
			activeOperator,
			effectivePuzzleMode
		),
		operatorSettings
	}
}

function resolveEffectivePuzzleMode(
	quiz: Quiz,
	activeOperator: Operator,
	normalizedDifficulty: AdaptiveDifficulty
): PuzzleMode {
	if (normalizedDifficulty !== adaptiveDifficultyId) return quiz.puzzleMode

	return getAdaptivePuzzleMode(quiz.adaptiveSkillByOperator[activeOperator])
}

function resolveAdaptiveOperatorSettings(
	quiz: Quiz,
	activeOperator: Operator,
	normalizedDifficulty: AdaptiveDifficulty,
	cooldownStepsRemaining: number = 0
): OperatorSettings {
	const baseSettings = quiz.operatorSettings[activeOperator]

	const adaptiveSettings = getAdaptiveSettingsForOperator(
		activeOperator,
		quiz.adaptiveSkillByOperator[activeOperator],
		normalizedDifficulty,
		baseSettings.range,
		baseSettings.possibleValues,
		cooldownStepsRemaining
	)

	return {
		...baseSettings,
		range: adaptiveSettings.range,
		...(adaptiveSettings.secondaryRange != null && {
			secondaryRange: adaptiveSettings.secondaryRange
		}),
		possibleValues: adaptiveSettings.possibleValues
	}
}

function resolveOperator(
	operator: OperatorExtended | undefined,
	normalizedDifficulty: AdaptiveDifficulty,
	adaptiveSkillByOperator: AdaptiveSkillMap
): Operator {
	invariant(
		operator !== undefined,
		'Cannot get operator: parameter is undefined'
	)

	if (operator !== OperatorExtended.All) return operator

	if (normalizedDifficulty !== adaptiveDifficultyId)
		return Math.floor(
			Math.random() * adaptiveTuning.adaptiveAllOperatorCount
		) as Operator

	return resolveAdaptiveAllOperator(adaptiveSkillByOperator)
}

const eligibleAdaptiveAllOperators: Operator[] = [
	Operator.Addition,
	Operator.Subtraction,
	Operator.Multiplication,
	Operator.Division
]

function resolveAdaptiveAllOperator(
	adaptiveSkillByOperator: AdaptiveSkillMap
): Operator {
	return pickWeightedOperatorBySkill(
		eligibleAdaptiveAllOperators,
		adaptiveSkillByOperator
	)
}

function pickWeightedOperatorBySkill(
	operators: Operator[],
	adaptiveSkillByOperator: AdaptiveSkillMap
): Operator {
	invariant(
		operators.length > 0,
		'Cannot pick weighted operator: no operators provided'
	)

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
	invariant(
		lastOperator !== undefined,
		'Cannot pick weighted operator: no operators provided'
	)

	return lastOperator
}

function getPuzzleParts(
	settings: OperatorSettings,
	recentParts: PuzzlePartSet[],
	allowNegativeAnswers: boolean,
	preferNoCarry: boolean = false,
	operator?: Operator,
	skill?: number
): PuzzlePartSet {
	const previousParts = recentParts.length
		? recentParts[recentParts.length - 1]
		: undefined
	const minDifficulty =
		operator != null && skill != null
			? Math.floor(skill * adaptiveTuning.minDifficultyFraction)
			: 0
	const maxAttempts = 10
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const parts = generateParts(settings, previousParts, allowNegativeAnswers)
		const isRepeat = recentParts.some((recent) => isSamePuzzle(parts, recent))
		const hasUnwantedCarry =
			preferNoCarry &&
			requiresCarryOrBorrow(
				parts[0].generatedValue,
				parts[1].generatedValue,
				settings.operator === Operator.Subtraction
			)
		const tooEasy =
			minDifficulty > 0 &&
			operator != null &&
			getPuzzleDifficulty(operator, parts) < minDifficulty
		if (!isRepeat && !hasUnwantedCarry && !tooEasy) return parts
	}
	return generateParts(settings, previousParts, allowNegativeAnswers)
}

function getCooldownStepsRemaining(
	recentPuzzles: Puzzle[],
	operator: Operator
): number {
	let sameOpSinceIncorrect = 0
	for (let i = recentPuzzles.length - 1; i >= 0; i--) {
		const p = recentPuzzles[i]!
		if (p.operator !== operator) continue
		if (p.isCorrect === false) {
			return Math.max(
				0,
				adaptiveTuning.incorrectCooldownSteps - sameOpSinceIncorrect
			)
		}
		sameOpSinceIncorrect++
	}
	return 0
}

function requiresCarryOrBorrow(
	a: number,
	b: number,
	isSubtraction: boolean
): boolean {
	a = Math.abs(a)
	b = Math.abs(b)

	if (isSubtraction) {
		if (a < b) [a, b] = [b, a]
		// Check each column: if top digit < bottom digit, borrowing is needed.
		// We return at the first borrow, so no propagation tracking is needed.
		while (a > 0 || b > 0) {
			if (a % 10 < b % 10) return true
			a = Math.floor(a / 10)
			b = Math.floor(b / 10)
		}
		return false
	}

	// Addition: any column pair summing to >= 10 means a carry
	while (a > 0 || b > 0) {
		if ((a % 10) + (b % 10) >= 10) return true
		a = Math.floor(a / 10)
		b = Math.floor(b / 10)
	}
	return false
}

function isSamePuzzle(a: PuzzlePartSet, b: PuzzlePartSet): boolean {
	return (
		a[0].generatedValue === b[0].generatedValue &&
		a[1].generatedValue === b[1].generatedValue &&
		a[2].generatedValue === b[2].generatedValue
	)
}

function generateParts(
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
		case Operator.Subtraction: {
			generateAddSubOperands(parts, settings, previousParts)

			if (
				settings.operator === Operator.Subtraction &&
				!allowNegativeAnswers &&
				parts[1].generatedValue > parts[0].generatedValue
			) {
				;[parts[0].generatedValue, parts[1].generatedValue] = [
					parts[1].generatedValue,
					parts[0].generatedValue
				]
			}

			parts[2].generatedValue =
				settings.operator === Operator.Addition
					? parts[0].generatedValue + parts[1].generatedValue
					: parts[0].generatedValue - parts[1].generatedValue
			break
		}

		case Operator.Multiplication:
			parts[0].generatedValue = getRandomNumberFromArray(
				settings.possibleValues,
				previousParts?.[0].generatedValue
			)
			parts[1].generatedValue = getRandomNumber(
				settings.range[0],
				settings.range[1],
				previousParts?.[1].generatedValue
			)
			parts[2].generatedValue =
				parts[0].generatedValue * parts[1].generatedValue
			break

		case Operator.Division:
			parts[0].generatedValue = getRandomNumber(
				settings.range[0],
				settings.range[1],
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
			return assertNever(
				settings.operator,
				'Cannot get puzzleParts: Operator not recognized'
			)
	}

	return parts
}

function generateAddSubOperands(
	parts: PuzzlePartSet,
	settings: OperatorSettings,
	previousParts: PuzzlePartSet | undefined
) {
	const primaryRange = settings.range
	const hasSecondaryRange = settings.secondaryRange != null
	const secondaryRange = settings.secondaryRange ?? settings.range

	// Randomly assign which operand gets the (potentially larger) primary range
	// so the bigger number doesn't always appear on the same side.
	// Skip the coin flip when both ranges are identical (custom mode).
	const swapped = hasSecondaryRange && Math.random() < 0.5
	const firstRange = swapped ? secondaryRange : primaryRange
	const secondRange = swapped ? primaryRange : secondaryRange

	parts[0].generatedValue = getRandomNumber(
		firstRange[0],
		firstRange[1],
		previousParts?.[0].generatedValue
	)
	parts[1].generatedValue = getRandomNumber(
		secondRange[0],
		secondRange[1],
		previousParts?.[1].generatedValue
	)
}

function getInitialDivisionPartValue(puzzleParts: PuzzlePartSet | undefined) {
	if (!puzzleParts) return undefined

	return puzzleParts[0].generatedValue / puzzleParts[1].generatedValue
}

function getRandomNumberFromArray(
	numbers: number[],
	previousNumber: number | undefined
): number {
	invariant(
		numbers.length > 0,
		'Cannot get random number: empty array provided'
	)

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
			return 2
		default:
			return assertNever(
				puzzleMode,
				'Cannot get unknown puzzle part number: PuzzleMode not recognized'
			)
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
	}

	return assertNever(operator, 'Cannot get alternate unknown puzzle part')
}

function getTrueOrFalse() {
	// Stolen from https://stackoverflow.com/a/36756480
	return Math.random() >= 0.5
}
