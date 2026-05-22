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
	getAdaptivePuzzleMode,
	getAdaptiveSettingsForOperator,
	isAdaptiveDifficulty,
	normalizeDifficulty
} from './adaptiveHelper'
import {
	evaluatePuzzleCandidate,
	getCandidateScore,
	type PuzzleCandidateEvaluation
} from './puzzleCandidateEvaluation'
import { assertNever, invariant } from './assertions'
import { type Rng, nextInt, nextFloat, nextBool } from './rng'
import { resolveOperator } from './operatorResolution'

const estimationOperatorRngPerturbationSteps: Record<Operator, number> = {
	[Operator.Addition]: 3,
	[Operator.Subtraction]: 7,
	[Operator.Multiplication]: 13,
	[Operator.Division]: 19
}

/**
 * Generates the next puzzle for a running quiz.
 * Resolves the active operator (weighted random for "All" mode),
 * determines the effective puzzle mode and difficulty via the adaptive system,
 * and produces puzzle parts that avoid repeating recent puzzles.
 *
 * Difficulty is calculated using operator-specific models (power curves for +/−,
 * weighted blends for ×/÷). The system selects the best candidate puzzle according
 * to a penalty hierarchy: out-of-window > repeat > unwanted carry.
 * See [docs/ADAPTIVE_ALGORITHM.md](../../docs/ADAPTIVE_ALGORITHM.md#difficulty-scoring)
 * for scoring details and [docs/ADAPTIVE_ALGORITHM.md](../../docs/ADAPTIVE_ALGORITHM.md#puzzle-generation--repeat-prevention) for candidate evaluation.
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
	// Estimation mode always targets result estimation, so align downstream
	// adaptive shaping with the effective unknown part shown to the learner.
	const effectiveUnknownPartIndex = quiz.estimationMode ? 2 : unknownPartIndex
	const isAlgebraicForm = isAlgebraicUnknownPart(effectiveUnknownPartIndex)
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
			adaptiveTuning.additionSubtraction.carryBorrowSkillThreshold &&
		(activeOperator === Operator.Addition ||
			activeOperator === Operator.Subtraction)

	if (quiz.estimationMode) {
		// Apply operator-specific perturbation so operators at the same skill do
		// not generate identical operand sequences in estimation mode.
		const perturbationSteps =
			estimationOperatorRngPerturbationSteps[activeOperator]
		for (let i = 0; i < perturbationSteps; i++) {
			nextInt(rng, 0, 1)
		}
	}

	const recentParts = recentPuzzles.map((p) => p.parts)

	const isAllOperatorMode =
		isAdaptiveDifficulty(normalizedDifficulty) &&
		quiz.selectedOperator === OperatorExtended.All
	const isCoolingDown = cooldownStepsRemaining > 0

	return {
		parts: getPuzzleParts(
			rng,
			operatorSettings,
			recentParts,
			allowNegativeAnswers,
			preferNoCarry,
			activeOperator,
			operatorSettings.effectiveSkill,
			isAllOperatorMode ? quiz.adaptiveSkillByOperator : undefined,
			isAllOperatorMode && !isCoolingDown
		),
		operator: activeOperator,
		duration: 0,
		isCorrect: undefined,
		puzzleMode: effectivePuzzleMode,
		unknownPartIndex: effectiveUnknownPartIndex
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
		isAlgebraicForm,
		quiz.estimationMode
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

function generateAndEvaluateCandidate(
	rng: Rng,
	settings: OperatorSettings,
	previousParts: PuzzlePartSet | undefined,
	allowNegativeAnswers: boolean,
	recentParts: PuzzlePartSet[],
	minDifficulty: number,
	maxDifficulty: number,
	preferNoCarry: boolean,
	prioritizeDifficultyWindow: boolean
): {
	parts: PuzzlePartSet
	evaluation: PuzzleCandidateEvaluation
	score: number
} {
	const parts = generateParts(
		rng,
		settings,
		previousParts,
		allowNegativeAnswers
	)
	const evaluation = evaluatePuzzleCandidate(
		parts,
		recentParts,
		settings.operator,
		minDifficulty,
		maxDifficulty,
		preferNoCarry
	)

	return {
		parts,
		evaluation,
		score: getCandidateScore(evaluation, prioritizeDifficultyWindow)
	}
}

function getPuzzleParts(
	rng: Rng,
	settings: OperatorSettings,
	recentParts: PuzzlePartSet[],
	allowNegativeAnswers: boolean,
	preferNoCarry = false,
	operator?: Operator,
	skill?: number,
	adaptiveSkillByOperator?: AdaptiveSkillMap,
	applyWeakOperatorBoost = false
): PuzzlePartSet {
	const previousParts = recentParts.length
		? recentParts[recentParts.length - 1]
		: undefined
	const maxDifficulty =
		operator != null && skill != null
			? Math.min(
					adaptiveTuning.skillBounds.maxSkill,
					Math.ceil(
						skill + adaptiveTuning.thresholds.adaptiveDifficultyMaxOvershoot
					)
				)
			: adaptiveTuning.skillBounds.maxSkill
	const skillWindowMinDifficulty =
		operator != null && skill != null
			? Math.max(
					0,
					skill - adaptiveTuning.thresholds.adaptiveDifficultyMaxOvershoot
				)
			: 0
	let minDifficulty =
		operator != null && skill != null
			? Math.max(
					Math.floor(skill * adaptiveTuning.thresholds.minDifficultyThreshold),
					skillWindowMinDifficulty
				)
			: 0

	// Dynamic window: when the ceiling clamp narrows the window below
	// asymmetricWindowFloor, extend minDifficulty downward to guarantee
	// a minimum window width. Only activates near the skill ceiling.
	if (
		operator != null &&
		skill != null &&
		maxDifficulty - minDifficulty <
			adaptiveTuning.thresholds.asymmetricWindowFloor
	) {
		minDifficulty = Math.max(
			0,
			maxDifficulty - adaptiveTuning.thresholds.asymmetricWindowFloor
		)
	}

	// Weak-operator difficulty boost: when an operator's skill is far below
	// the average across all operators, nudge minDifficulty up to force
	// slightly harder puzzles and accelerate catch-up.
	if (
		applyWeakOperatorBoost &&
		operator != null &&
		skill != null &&
		adaptiveSkillByOperator != null
	) {
		const avgSkill =
			adaptiveSkillByOperator.reduce((sum, s) => sum + s, 0) /
			adaptiveSkillByOperator.length
		if (
			avgSkill - skill >=
			adaptiveTuning.operatorMixing.weakOperatorGapThreshold
		) {
			minDifficulty = Math.min(
				maxDifficulty,
				minDifficulty +
					adaptiveTuning.operatorMixing.weakOperatorMinDifficultyBoost
			)
		}
	}

	const isHighSkillMulDiv =
		operator != null &&
		skill != null &&
		(operator === Operator.Multiplication || operator === Operator.Division) &&
		skill >=
			adaptiveTuning.skillBounds.maxSkill -
				adaptiveTuning.thresholds.asymmetricWindowFloor
	const prioritizeDifficultyWindow = isHighSkillMulDiv
	const maxAttempts = 25
	let selectedCandidate: PuzzlePartSet | undefined
	let selectedCandidateScore = Number.POSITIVE_INFINITY
	let selectedCandidateEvaluation: PuzzleCandidateEvaluation | undefined
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const { parts, evaluation, score } = generateAndEvaluateCandidate(
			rng,
			settings,
			previousParts,
			allowNegativeAnswers,
			recentParts,
			minDifficulty,
			maxDifficulty,
			preferNoCarry,
			prioritizeDifficultyWindow
		)
		const { isRepeat, hasUnwantedCarry, tooEasy, tooHard } = evaluation
		if (!isRepeat && !hasUnwantedCarry && !tooEasy && !tooHard) return parts

		if (score < selectedCandidateScore) {
			selectedCandidateScore = score
			selectedCandidate = parts
			selectedCandidateEvaluation = evaluation
		}
	}

	if (
		prioritizeDifficultyWindow &&
		selectedCandidateEvaluation != null &&
		(selectedCandidateEvaluation.tooEasy || selectedCandidateEvaluation.tooHard)
	) {
		// High-skill mul/div can be window-sparse for some seeds.
		// Try additional samples and accept the first in-window candidate,
		// even if it's a recent repeat.
		for (let attempt = 0; attempt < 40; attempt++) {
			const parts = generateParts(
				rng,
				settings,
				previousParts,
				allowNegativeAnswers
			)
			const evaluation = evaluatePuzzleCandidate(
				parts,
				recentParts,
				settings.operator,
				minDifficulty,
				maxDifficulty,
				preferNoCarry
			)

			if (!evaluation.tooEasy && !evaluation.tooHard) return parts
		}
	}

	if (selectedCandidate !== undefined) return selectedCandidate

	return generateParts(rng, settings, previousParts, allowNegativeAnswers)
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
				adaptiveTuning.penalties.incorrectCooldownSteps - sameOpSinceIncorrect
			)
		}
		sameOpSinceIncorrect++
	}
	return 0
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
	const startSkill =
		adaptiveTuning.algebraicRollout.adaptiveNegativeSubtractionStartSkill
	const fullSkill =
		adaptiveTuning.algebraicRollout.adaptiveNegativeSubtractionFullSkill
	return interpolateSkillProbability(skill, startSkill, fullSkill)
}

function interpolateSkillProbability(
	skill: number,
	startSkill: number,
	fullSkill: number,
	fullProbability = 1
): number {
	const safeSkill = Math.max(
		adaptiveTuning.skillBounds.minSkill,
		Math.min(adaptiveTuning.skillBounds.maxSkill, skill)
	)

	if (safeSkill <= startSkill) return 0
	if (safeSkill >= fullSkill) return fullProbability

	const progress = (safeSkill - startSkill) / (fullSkill - startSkill)
	return progress * fullProbability
}

function getAdaptiveDivisionUnknownDivisorProbability(skill: number): number {
	const startSkill =
		adaptiveTuning.algebraicRollout.adaptiveDivisionDivisorUnknownStartSkill
	const fullSkill =
		adaptiveTuning.algebraicRollout.adaptiveDivisionDivisorUnknownFullSkill
	const maxProbability =
		adaptiveTuning.algebraicRollout
			.adaptiveDivisionDivisorUnknownProbabilityInAlternate
	return interpolateSkillProbability(
		skill,
		startSkill,
		fullSkill,
		maxProbability
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
