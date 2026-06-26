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
	getActiveTuning,
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
	const request = resolvePuzzlePartsRequest(rng, quiz, recentPuzzles)

	return {
		parts: getPuzzleParts({
			rng,
			settings: request.operatorSettings,
			recentParts: recentPuzzles.map((p) => p.parts),
			allowNegativeAnswers: request.allowNegativeAnswers,
			preferNoCarry: request.preferNoCarry,
			adaptiveContext: request.adaptiveContext
		}),
		operator: request.operator,
		duration: 0,
		isCorrect: undefined,
		puzzleMode: request.effectivePuzzleMode,
		unknownPartIndex: request.unknownPartIndex
	}
}

interface ResolvedPuzzlePartsRequest {
	operator: Operator
	effectivePuzzleMode: PuzzleMode
	unknownPartIndex: PuzzlePartIndex
	operatorSettings: OperatorSettings & { effectiveSkill: number }
	allowNegativeAnswers: boolean
	preferNoCarry: boolean
	adaptiveContext: AdaptiveContext
}

function resolvePuzzlePartsRequest(
	rng: Rng,
	quiz: Quiz,
	recentPuzzles: Puzzle[]
): ResolvedPuzzlePartsRequest {
	const t = getActiveTuning()
	const normalizedDifficulty = normalizeDifficulty(quiz.difficulty)
	const usesAdaptiveDifficulty = isAdaptiveDifficulty(normalizedDifficulty)
	const operator: Operator = resolveOperator(
		rng,
		quiz.selectedOperator,
		normalizedDifficulty,
		quiz.adaptiveSkillByOperator
	)
	const operatorSkill = quiz.adaptiveSkillByOperator[operator]
	const effectivePuzzleMode = resolveEffectivePuzzleMode(
		rng,
		quiz,
		normalizedDifficulty,
		operatorSkill
	)
	const unknownPartIndex = getUnknownPuzzlePartNumber(
		rng,
		operator,
		effectivePuzzleMode,
		operatorSkill,
		usesAdaptiveDifficulty
	)
	const cooldownStepsRemaining = usesAdaptiveDifficulty
		? getCooldownStepsRemaining(recentPuzzles, operator)
		: 0
	const operatorSettings = resolveAdaptiveOperatorSettings(
		quiz,
		operator,
		normalizedDifficulty,
		cooldownStepsRemaining,
		isAlgebraicUnknownPart(unknownPartIndex)
	)
	const allowNegativeAnswers = usesAdaptiveDifficulty
		? operator === Operator.Subtraction &&
			nextFloat(rng) <
				getAdaptiveNegativeSubtractionProbability(
					quiz.adaptiveSkillByOperator[Operator.Subtraction]
				)
		: quiz.allowNegativeAnswers
	const preferNoCarry =
		usesAdaptiveDifficulty &&
		operatorSettings.effectiveSkill <
			t.additionSubtraction.carryBorrowSkillThreshold &&
		(operator === Operator.Addition || operator === Operator.Subtraction)
	const isAllOperatorMode =
		usesAdaptiveDifficulty && quiz.selectedOperator === OperatorExtended.All
	const isCoolingDown = cooldownStepsRemaining > 0

	return {
		operator,
		effectivePuzzleMode,
		unknownPartIndex,
		operatorSettings,
		allowNegativeAnswers,
		preferNoCarry,
		adaptiveContext: {
			operator,
			skill: operatorSettings.effectiveSkill,
			...(isAllOperatorMode && {
				adaptiveSkillByOperator: quiz.adaptiveSkillByOperator
			}),
			applyWeakOperatorBoost: isAllOperatorMode && !isCoolingDown
		}
	}
}

function resolveEffectivePuzzleMode(
	rng: Rng,
	quiz: Quiz,
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

interface ScoredCandidate {
	parts: PuzzlePartSet
	evaluation: PuzzleCandidateEvaluation
	score: number
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
): ScoredCandidate {
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

/**
 * Adaptive inputs that shape the difficulty window for candidate selection.
 * Present only for adaptive difficulty; absent for custom difficulty.
 */
interface AdaptiveContext {
	operator: Operator
	skill: number
	adaptiveSkillByOperator?: AdaptiveSkillMap
	applyWeakOperatorBoost: boolean
}

interface DifficultyWindow {
	minDifficulty: number
	maxDifficulty: number
	prioritizeDifficultyWindow: boolean
}

interface PuzzlePartsRequest {
	rng: Rng
	settings: OperatorSettings
	recentParts: PuzzlePartSet[]
	allowNegativeAnswers: boolean
	preferNoCarry?: boolean
	adaptiveContext?: AdaptiveContext
}

const PRIMARY_SAMPLE_ATTEMPTS = 25
const WINDOW_FALLBACK_SAMPLE_ATTEMPTS = 40

/**
 * Computes the difficulty window `[minDifficulty, maxDifficulty]` used to
 * accept or reject candidate puzzles, plus whether staying inside the window
 * should be prioritized over avoiding repeats.
 *
 * Without an adaptive context the window spans the full skill range.
 */
export function computeDifficultyWindow(
	context: AdaptiveContext | undefined
): DifficultyWindow {
	const t = getActiveTuning()

	if (context == null) {
		return {
			minDifficulty: 0,
			maxDifficulty: t.skillBounds.maxSkill,
			prioritizeDifficultyWindow: false
		}
	}

	const { operator, skill, adaptiveSkillByOperator, applyWeakOperatorBoost } =
		context

	const maxDifficulty = Math.min(
		t.skillBounds.maxSkill,
		Math.ceil(skill + t.thresholds.difficultyWindowOvershoot)
	)
	const skillWindowMinDifficulty = Math.max(
		0,
		skill - t.thresholds.difficultyWindowOvershoot
	)
	let minDifficulty = Math.max(
		Math.floor(skill * t.thresholds.minDifficultyRatio),
		skillWindowMinDifficulty
	)

	// Dynamic window: when the ceiling clamp narrows the window below
	// minWindowSize, extend minDifficulty downward to guarantee a minimum
	// window width. Only activates near the skill ceiling.
	if (maxDifficulty - minDifficulty < t.thresholds.minWindowSize) {
		minDifficulty = Math.max(0, maxDifficulty - t.thresholds.minWindowSize)
	}

	// Weak-operator difficulty boost: when an operator's skill is far below
	// the average across all operators, nudge minDifficulty up to force
	// slightly harder puzzles and accelerate catch-up.
	if (applyWeakOperatorBoost && adaptiveSkillByOperator != null) {
		const avgSkill =
			adaptiveSkillByOperator.reduce((sum, s) => sum + s, 0) /
			adaptiveSkillByOperator.length
		if (avgSkill - skill >= t.operatorMixing.weakOperatorGapThreshold) {
			minDifficulty = Math.min(
				maxDifficulty,
				minDifficulty + t.operatorMixing.weakOperatorMinDifficultyBoost
			)
		}
	}

	const prioritizeDifficultyWindow =
		(operator === Operator.Multiplication || operator === Operator.Division) &&
		skill >= t.skillBounds.maxSkill - t.thresholds.minWindowSize

	return { minDifficulty, maxDifficulty, prioritizeDifficultyWindow }
}

function getPuzzleParts(request: PuzzlePartsRequest): PuzzlePartSet {
	const {
		rng,
		settings,
		recentParts,
		allowNegativeAnswers,
		preferNoCarry = false,
		adaptiveContext
	} = request

	const previousParts = recentParts.length
		? recentParts[recentParts.length - 1]
		: undefined

	const { minDifficulty, maxDifficulty, prioritizeDifficultyWindow } =
		computeDifficultyWindow(adaptiveContext)

	const sampleCandidate = (): ScoredCandidate =>
		generateAndEvaluateCandidate(
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

	let best: ScoredCandidate | undefined
	for (let attempt = 0; attempt < PRIMARY_SAMPLE_ATTEMPTS; attempt++) {
		const candidate = sampleCandidate()
		const { isRepeat, hasUnwantedCarry, tooEasy, tooHard } =
			candidate.evaluation
		if (!isRepeat && !hasUnwantedCarry && !tooEasy && !tooHard) {
			return candidate.parts
		}

		if (best == null || candidate.score < best.score) {
			best = candidate
		}
	}

	// High-skill mul/div can be window-sparse for some seeds. When the best
	// candidate is still out of window, draw additional samples and accept the
	// first in-window candidate, even if it's a recent repeat.
	if (
		prioritizeDifficultyWindow &&
		best != null &&
		(best.evaluation.tooEasy || best.evaluation.tooHard)
	) {
		for (
			let attempt = 0;
			attempt < WINDOW_FALLBACK_SAMPLE_ATTEMPTS;
			attempt++
		) {
			const candidate = sampleCandidate()
			if (!candidate.evaluation.tooEasy && !candidate.evaluation.tooHard) {
				return candidate.parts
			}
		}
	}

	if (best != null) return best.parts

	return generateParts(rng, settings, previousParts, allowNegativeAnswers)
}

function getCooldownStepsRemaining(
	recentPuzzles: Puzzle[],
	operator: Operator
): number {
	const t = getActiveTuning()
	let sameOpSinceIncorrect = 0
	for (let i = recentPuzzles.length - 1; i >= 0; i--) {
		const p = recentPuzzles[i]
		if (p === undefined) throw new Error('Expected puzzle at valid index')
		if (p.operator !== operator) continue
		if (p.isCorrect === false) {
			return Math.max(0, t.penalties.cooldownSteps - sameOpSinceIncorrect)
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
	const t = getActiveTuning()
	const startSkill = t.algebraicRollout.negativeSubStartSkill
	const fullSkill = t.algebraicRollout.negativeSubFullSkill
	return interpolateSkillProbability(skill, startSkill, fullSkill)
}

function interpolateSkillProbability(
	skill: number,
	startSkill: number,
	fullSkill: number,
	fullProbability = 1
): number {
	const t = getActiveTuning()
	const safeSkill = Math.max(
		t.skillBounds.minSkill,
		Math.min(t.skillBounds.maxSkill, skill)
	)

	if (safeSkill <= startSkill) return 0
	if (safeSkill >= fullSkill) return fullProbability

	const progress = (safeSkill - startSkill) / (fullSkill - startSkill)
	return progress * fullProbability
}

function getAdaptiveDivisionUnknownDivisorProbability(skill: number): number {
	const t = getActiveTuning()
	const startSkill = t.algebraicRollout.divisorUnknownStartSkill
	const fullSkill = t.algebraicRollout.divisorUnknownFullSkill
	const maxProbability = t.algebraicRollout.divisorUnknownProbability
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
		default: {
			const exhaustiveCheck: never = operator
			throw new Error(
				`[Invariant] Cannot get alternate unknown puzzle part: ${String(exhaustiveCheck)}`
			)
		}
	}
}
