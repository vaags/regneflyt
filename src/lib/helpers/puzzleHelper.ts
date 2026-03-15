import type { Quiz } from '$lib/models/Quiz'
import { Operator, OperatorExtended } from '$lib/constants/Operator'
import type { Puzzle, PuzzlePartIndex, PuzzlePartSet } from '$lib/models/Puzzle'
import { PuzzleMode } from '$lib/constants/PuzzleMode'
import type { OperatorSettings } from '$lib/models/OperatorSettings'
import {
	adaptiveDifficultyId,
	adaptiveTuning,
	type AdaptiveSkillMap,
	type AdaptiveDifficulty
} from '$lib/models/AdaptiveProfile'
import {
	getAdaptivePuzzleMode,
	getAdaptiveSettingsForOperator,
	getPuzzleDifficulty,
	normalizeDifficulty
} from './adaptiveHelper'
import { assertNever, invariant } from './assertions'
import { type Rng, nextInt, nextFloat, nextBool } from './rng'

/**
 * Generates the next puzzle for a running quiz.
 * Resolves the active operator (weighted random for "All" mode),
 * determines the effective puzzle mode and difficulty via the adaptive system,
 * and produces puzzle parts that avoid repeating recent puzzles.
 *
 * @param rng - Seeded random number generator (mutated in place)
 * @param quiz - Current quiz state including settings and skill levels
 * @param recentPuzzles - Recent puzzles used to avoid repetition
 * @returns A new {@link Puzzle} ready for display
 */
export function getPuzzle(
	rng: Rng,
	quiz: Quiz,
	recentPuzzles: Puzzle[] = []
): Puzzle {
	const normalizedDifficulty = normalizeDifficulty(quiz.difficulty)
	const activeOperator: Operator = resolveOperator(
		rng,
		quiz.selectedOperator,
		normalizedDifficulty,
		quiz.adaptiveSkillByOperator
	)

	const cooldownStepsRemaining =
		normalizedDifficulty === adaptiveDifficultyId
			? getCooldownStepsRemaining(recentPuzzles, activeOperator)
			: 0

	const effectivePuzzleMode = resolveEffectivePuzzleMode(
		rng,
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
			rng,
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
			rng,
			activeOperator,
			effectivePuzzleMode
		),
		operatorSettings
	}
}

function resolveEffectivePuzzleMode(
	rng: Rng,
	quiz: Quiz,
	activeOperator: Operator,
	normalizedDifficulty: AdaptiveDifficulty
): PuzzleMode {
	if (normalizedDifficulty !== adaptiveDifficultyId) return quiz.puzzleMode

	return getAdaptivePuzzleMode(
		rng,
		quiz.adaptiveSkillByOperator[activeOperator]
	)
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
	rng: Rng,
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
		return nextInt(
			rng,
			0,
			adaptiveTuning.adaptiveAllOperatorCount - 1
		) as Operator

	return resolveAdaptiveAllOperator(rng, adaptiveSkillByOperator)
}

const eligibleAdaptiveAllOperators: Operator[] = [
	Operator.Addition,
	Operator.Subtraction,
	Operator.Multiplication,
	Operator.Division
]

function resolveAdaptiveAllOperator(
	rng: Rng,
	adaptiveSkillByOperator: AdaptiveSkillMap
): Operator {
	return pickWeightedOperatorBySkill(
		rng,
		eligibleAdaptiveAllOperators,
		adaptiveSkillByOperator
	)
}

function pickWeightedOperatorBySkill(
	rng: Rng,
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
	let randomWeight = nextFloat(rng) * totalWeight

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
	rng: Rng,
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
		const parts = generateParts(
			rng,
			settings,
			previousParts,
			allowNegativeAnswers
		)
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
	return generateParts(rng, settings, previousParts, allowNegativeAnswers)
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
	rng: Rng,
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
			generateAddSubOperands(rng, parts, settings, previousParts)

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
				rng,
				settings.possibleValues,
				previousParts?.[0].generatedValue
			)
			parts[1].generatedValue = getRandomNumber(
				rng,
				settings.range[0],
				settings.range[1],
				previousParts?.[1].generatedValue
			)
			parts[2].generatedValue =
				parts[0].generatedValue * parts[1].generatedValue
			break

		case Operator.Division:
			parts[0].generatedValue = getRandomNumber(
				rng,
				settings.range[0],
				settings.range[1],
				getInitialDivisionPartValue(previousParts)
			)
			parts[1].generatedValue = getRandomNumberFromArray(
				rng,
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
	rng: Rng,
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
	const swapped = hasSecondaryRange && nextBool(rng)
	const firstRange = swapped ? secondaryRange : primaryRange
	const secondRange = swapped ? primaryRange : secondaryRange

	parts[0].generatedValue = getRandomNumber(
		rng,
		firstRange[0],
		firstRange[1],
		previousParts?.[0].generatedValue
	)
	parts[1].generatedValue = getRandomNumber(
		rng,
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
	rng: Rng,
	numbers: number[],
	previousNumber: number | undefined
): number {
	invariant(
		numbers.length > 0,
		'Cannot get random number: empty array provided'
	)

	if (numbers.length === 1) return numbers[0] as number

	const candidates =
		previousNumber !== undefined
			? numbers.filter((n) => n !== previousNumber)
			: numbers

	const pool = candidates.length > 0 ? candidates : numbers
	return pool[nextInt(rng, 0, pool.length - 1)] as number
}

function getRandomNumber(
	rng: Rng,
	min: number,
	max: number,
	exclude: number | undefined = undefined
): number {
	if (max <= min) return min

	if (exclude === undefined || exclude < min || exclude > max) {
		return nextInt(rng, min, max)
	}

	const rnd = nextInt(rng, min, max - 1)
	return rnd >= exclude ? rnd + 1 : rnd
}

function getUnknownPuzzlePartNumber(
	rng: Rng,
	operator: Operator,
	puzzleMode: PuzzleMode
): PuzzlePartIndex {
	switch (puzzleMode) {
		case PuzzleMode.Random:
			return nextBool(rng) ? getAlternateUnknownPuzzlePart(rng, operator) : 2
		case PuzzleMode.Alternate:
			return getAlternateUnknownPuzzlePart(rng, operator)
		case PuzzleMode.Normal:
			return 2
		default:
			return assertNever(
				puzzleMode,
				'Cannot get unknown puzzle part number: PuzzleMode not recognized'
			)
	}
}

function getAlternateUnknownPuzzlePart(rng: Rng, operator: Operator) {
	switch (operator) {
		case Operator.Addition:
		case Operator.Subtraction:
			return nextBool(rng) ? 0 : 1
		case Operator.Multiplication:
			return 1
		case Operator.Division:
			return 0
	}

	return assertNever(operator, 'Cannot get alternate unknown puzzle part')
}
