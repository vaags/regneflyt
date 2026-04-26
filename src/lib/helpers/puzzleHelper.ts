import type { Quiz } from '$lib/models/Quiz'
import { Operator, OperatorExtended } from '$lib/constants/Operator'
import type {
	Puzzle,
	PuzzlePart,
	PuzzlePartIndex,
	PuzzlePartSet
} from '$lib/models/Puzzle'
import { PuzzleMode } from '$lib/constants/PuzzleMode'
import type { OperatorSettings } from '$lib/models/OperatorSettings'
import {
	adaptiveTuning,
	type AdaptiveSkillMap,
	type DifficultyMode
} from '$lib/models/AdaptiveProfile'
import {
	countCarriesOrBorrows,
	getAdaptivePuzzleMode,
	getAdaptiveSettingsForOperator,
	isAdaptiveDifficulty,
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

	const cooldownStepsRemaining = isAdaptiveDifficulty(normalizedDifficulty)
		? getCooldownStepsRemaining(recentPuzzles, activeOperator)
		: 0

	const operatorSkill = quiz.adaptiveSkillByOperator[activeOperator]
	const effectivePuzzleMode = resolveEffectivePuzzleMode(
		rng,
		quiz,
		activeOperator,
		normalizedDifficulty,
		operatorSkill
	)
	const unknownPartIndex = getUnknownPuzzlePartNumber(
		rng,
		activeOperator,
		effectivePuzzleMode,
		operatorSkill,
		isAdaptiveDifficulty(normalizedDifficulty)
	)
	const isAlgebraicForm = isAlgebraicUnknownPart(unknownPartIndex)
	const operatorSettings = resolveAdaptiveOperatorSettings(
		quiz,
		activeOperator,
		normalizedDifficulty,
		cooldownStepsRemaining,
		isAlgebraicForm
	)

	const allowNegativeAnswers = isAdaptiveDifficulty(normalizedDifficulty)
		? activeOperator === Operator.Subtraction &&
			nextFloat(rng) <
				getAdaptiveNegativeSubtractionProbability(
					quiz.adaptiveSkillByOperator[Operator.Subtraction]
				)
		: quiz.allowNegativeAnswers

	const preferNoCarry =
		isAdaptiveDifficulty(normalizedDifficulty) &&
		operatorSettings.effectiveSkill <
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
			operatorSettings.effectiveSkill
		),
		operator: activeOperator,
		duration: 0,
		isCorrect: undefined,
		puzzleMode: effectivePuzzleMode,
		unknownPartIndex,
		operatorSettings
	}
}

function resolveEffectivePuzzleMode(
	rng: Rng,
	quiz: Quiz,
	activeOperator: Operator,
	normalizedDifficulty: DifficultyMode,
	operatorSkill: number
): PuzzleMode {
	if (!isAdaptiveDifficulty(normalizedDifficulty)) return quiz.puzzleMode

	return getAdaptivePuzzleMode(rng, operatorSkill)
}

function resolveAdaptiveOperatorSettings(
	quiz: Quiz,
	activeOperator: Operator,
	normalizedDifficulty: DifficultyMode,
	cooldownStepsRemaining = 0,
	isAlgebraicForm = false
): OperatorSettings & { effectiveSkill: number } {
	const baseSettings = quiz.operatorSettings[activeOperator]
	const adaptiveSkill = quiz.adaptiveSkillByOperator[activeOperator]

	const adaptiveSettings = getAdaptiveSettingsForOperator(
		activeOperator,
		adaptiveSkill,
		normalizedDifficulty,
		baseSettings.range,
		baseSettings.possibleValues,
		cooldownStepsRemaining,
		isAlgebraicForm
	)

	return {
		...baseSettings,
		range: adaptiveSettings.range,
		...(adaptiveSettings.secondaryRange != null && {
			secondaryRange: adaptiveSettings.secondaryRange
		}),
		possibleValues: adaptiveSettings.possibleValues,
		effectiveSkill: adaptiveSettings.effectiveSkill
	}
}

function isAlgebraicUnknownPart(unknownPartIndex: number): boolean {
	return unknownPartIndex === 0 || unknownPartIndex === 1
}

function resolveOperator(
	rng: Rng,
	operator: OperatorExtended | undefined,
	normalizedDifficulty: DifficultyMode,
	adaptiveSkillByOperator: AdaptiveSkillMap
): Operator {
	invariant(
		operator !== undefined,
		'Cannot get operator: parameter is undefined'
	)

	if (operator !== OperatorExtended.All) return operator

	if (!isAdaptiveDifficulty(normalizedDifficulty)) {
		switch (nextInt(rng, 0, adaptiveTuning.adaptiveAllOperatorCount - 1)) {
			case Operator.Addition:
				return Operator.Addition
			case Operator.Subtraction:
				return Operator.Subtraction
			case Operator.Multiplication:
				return Operator.Multiplication
			case Operator.Division:
				return Operator.Division
			default:
				throw new Error('Expected operator index in adaptive all range')
		}
	}

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
	preferNoCarry = false,
	operator?: Operator,
	skill?: number
): PuzzlePartSet {
	const previousParts = recentParts.length
		? recentParts[recentParts.length - 1]
		: undefined
	const skillWindowMinDifficulty =
		operator != null && skill != null
			? Math.max(0, skill - adaptiveTuning.adaptiveDifficultyMaxOvershoot)
			: 0
	const minDifficulty =
		operator != null && skill != null
			? Math.max(
					Math.floor(skill * adaptiveTuning.minDifficultyThreshold),
					skillWindowMinDifficulty
				)
			: 0
	const maxDifficulty =
		operator != null && skill != null
			? Math.min(
					adaptiveTuning.maxSkill,
					Math.ceil(skill + adaptiveTuning.adaptiveDifficultyMaxOvershoot)
				)
			: adaptiveTuning.maxSkill
	const prioritizeDifficultyWindow =
		operator != null &&
		skill != null &&
		(operator === Operator.Multiplication || operator === Operator.Division) &&
		skill >=
			adaptiveTuning.maxSkill - adaptiveTuning.adaptiveDifficultyMaxOvershoot
	const maxAttempts = 25
	let bestCandidate: PuzzlePartSet | undefined
	let bestCandidateScore = Number.POSITIVE_INFINITY
	let bestCandidateEvaluation: GeneratedPartsEvaluation | undefined
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const parts = generateParts(
			rng,
			settings,
			previousParts,
			allowNegativeAnswers
		)
		const evaluation = evaluateGeneratedParts({
			parts,
			recentParts,
			preferNoCarry,
			operator: settings.operator,
			minDifficulty,
			maxDifficulty
		})
		const { isRepeat, hasUnwantedCarry, tooEasy, tooHard } = evaluation
		if (!isRepeat && !hasUnwantedCarry && !tooEasy && !tooHard) return parts

		const score = getGeneratedPartsCandidateScore(
			evaluation,
			prioritizeDifficultyWindow
		)
		if (score < bestCandidateScore) {
			bestCandidateScore = score
			bestCandidate = parts
			bestCandidateEvaluation = evaluation
		}
	}

	if (
		prioritizeDifficultyWindow &&
		bestCandidateEvaluation != null &&
		(bestCandidateEvaluation.tooEasy || bestCandidateEvaluation.tooHard)
	) {
		// High-skill mul/div can be window-sparse for some seeds.
		// Try additional samples and accept the first in-window candidate,
		// even if it's a recent repeat.
		for (let attempt = 0; attempt < 75; attempt++) {
			const parts = generateParts(
				rng,
				settings,
				previousParts,
				allowNegativeAnswers
			)
			const evaluation = evaluateGeneratedParts({
				parts,
				recentParts,
				preferNoCarry,
				operator: settings.operator,
				minDifficulty,
				maxDifficulty
			})

			if (!evaluation.tooEasy && !evaluation.tooHard) return parts
		}
	}

	if (bestCandidate !== undefined) return bestCandidate

	return generateParts(rng, settings, previousParts, allowNegativeAnswers)
}

type GeneratedPartsEvaluation = {
	isRepeat: boolean
	hasUnwantedCarry: boolean
	tooEasy: boolean
	tooHard: boolean
	difficultyShortfall: number
	difficultyOvershoot: number
}

function evaluateGeneratedParts({
	parts,
	recentParts,
	preferNoCarry,
	operator,
	minDifficulty,
	maxDifficulty
}: {
	parts: PuzzlePartSet
	recentParts: PuzzlePartSet[]
	preferNoCarry: boolean
	operator: Operator
	minDifficulty: number
	maxDifficulty: number
}): GeneratedPartsEvaluation {
	const isRepeat = recentParts.some((recent) => isSamePuzzle(parts, recent))
	const hasUnwantedCarry =
		preferNoCarry &&
		countCarriesOrBorrows(
			parts[0].generatedValue,
			parts[1].generatedValue,
			operator === Operator.Subtraction
		) > 0

	const difficulty = getPuzzleDifficulty(operator, parts)
	const difficultyShortfall = Math.max(0, minDifficulty - difficulty)
	const difficultyOvershoot = Math.max(0, difficulty - maxDifficulty)

	return {
		isRepeat,
		hasUnwantedCarry,
		tooEasy: difficultyShortfall > 0,
		tooHard: difficultyOvershoot > 0,
		difficultyShortfall,
		difficultyOvershoot
	}
}

function getGeneratedPartsCandidateScore(
	{
		isRepeat,
		hasUnwantedCarry,
		difficultyShortfall,
		difficultyOvershoot
	}: GeneratedPartsEvaluation,
	prioritizeDifficultyWindow = false
): number {
	const outOfWindowPenalty =
		prioritizeDifficultyWindow &&
		(difficultyShortfall > 0 || difficultyOvershoot > 0)
			? 2_000_000
			: 0
	const repeatPenalty = isRepeat ? 1_000_000 : 0
	const carryPenalty = hasUnwantedCarry ? 100_000 : 0

	return (
		outOfWindowPenalty +
		repeatPenalty +
		carryPenalty +
		difficultyShortfall +
		difficultyOvershoot
	)
}

function getCooldownStepsRemaining(
	recentPuzzles: Puzzle[],
	operator: Operator
): number {
	let sameOpSinceIncorrect = 0
	for (let i = recentPuzzles.length - 1; i >= 0; i--) {
		const p = recentPuzzles[i]
		if (p === undefined) throw new Error('Expected puzzle at valid index')
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
	const createPuzzlePart = (): PuzzlePart => ({
		userDefinedValue: undefined,
		generatedValue: 0
	})
	const parts: PuzzlePartSet = [
		createPuzzlePart(),
		createPuzzlePart(),
		createPuzzlePart()
	]

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
): void {
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

function getInitialDivisionPartValue(
	puzzleParts: PuzzlePartSet | undefined
): number | undefined {
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

	if (numbers.length === 1) {
		const onlyValue = numbers[0]
		invariant(
			onlyValue !== undefined,
			'Cannot get random number: empty array provided'
		)
		return onlyValue
	}

	const candidates =
		previousNumber !== undefined
			? numbers.filter((n) => n !== previousNumber)
			: numbers

	const pool = candidates.length > 0 ? candidates : numbers
	const value = pool[nextInt(rng, 0, pool.length - 1)]
	invariant(value !== undefined, 'Cannot get random number: empty pool')
	return value
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
	puzzleMode: PuzzleMode,
	skill: number,
	adaptiveDifficulty: boolean
): PuzzlePartIndex {
	const divisionUnknownDivisorProbability =
		operator === Operator.Division && adaptiveDifficulty
			? getAdaptiveDivisionUnknownDivisorProbability(skill)
			: 0

	switch (puzzleMode) {
		case PuzzleMode.Random:
			return nextBool(rng)
				? getAlternateUnknownPuzzlePart(
						rng,
						operator,
						divisionUnknownDivisorProbability
					)
				: 2
		case PuzzleMode.Alternate:
			return getAlternateUnknownPuzzlePart(
				rng,
				operator,
				divisionUnknownDivisorProbability
			)
		case PuzzleMode.Normal:
			return 2
		default:
			return assertNever(
				puzzleMode,
				'Cannot get unknown puzzle part number: PuzzleMode not recognized'
			)
	}
}

function getAdaptiveNegativeSubtractionProbability(skill: number): number {
	const safeSkill = Math.max(
		adaptiveTuning.minSkill,
		Math.min(adaptiveTuning.maxSkill, skill)
	)
	const start = adaptiveTuning.adaptiveNegativeSubtractionStartSkill
	const full = adaptiveTuning.adaptiveNegativeSubtractionFullSkill

	if (safeSkill <= start) return 0
	if (safeSkill >= full) return 1

	return (safeSkill - start) / (full - start)
}

function getAdaptiveDivisionUnknownDivisorProbability(skill: number): number {
	const safeSkill = Math.max(
		adaptiveTuning.minSkill,
		Math.min(adaptiveTuning.maxSkill, skill)
	)
	const start = adaptiveTuning.adaptiveDivisionDivisorUnknownStartSkill
	const full = adaptiveTuning.adaptiveDivisionDivisorUnknownFullSkill

	if (safeSkill <= start) return 0
	if (safeSkill >= full)
		return adaptiveTuning.adaptiveDivisionDivisorUnknownProbabilityInAlternate

	const progress = (safeSkill - start) / (full - start)
	return (
		progress *
		adaptiveTuning.adaptiveDivisionDivisorUnknownProbabilityInAlternate
	)
}

function getAlternateUnknownPuzzlePart(
	rng: Rng,
	operator: Operator,
	divisionUnknownDivisorProbability = 0
): PuzzlePartIndex {
	switch (operator) {
		case Operator.Addition:
		case Operator.Subtraction:
			return nextBool(rng) ? 0 : 1
		case Operator.Multiplication:
			return nextBool(rng) ? 0 : 1
		case Operator.Division:
			return nextFloat(rng) < divisionUnknownDivisorProbability ? 1 : 0
	}

	return assertNever(operator, 'Cannot get alternate unknown puzzle part')
}
