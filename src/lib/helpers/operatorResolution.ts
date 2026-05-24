import { Operator, OperatorExtended } from '$lib/constants/Operator'
import {
	adaptiveInternals,
	getActiveTuning,
	type AdaptiveSkillMap,
	type DifficultyMode,
	type OperatorWeights
} from '$lib/models/AdaptiveProfile'
import { invariant } from './assertions'
import { isAdaptiveDifficulty } from './adaptiveHelper'
import { type Rng, nextFloat, nextInt } from './rng'

const eligibleAdaptiveAllOperators: Operator[] = [
	Operator.Addition,
	Operator.Subtraction,
	Operator.Multiplication,
	Operator.Division
]

export function resolveOperator(
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
		switch (nextInt(rng, 0, adaptiveInternals.operatorCount - 1)) {
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
	const t = getActiveTuning()
	invariant(
		operators.length > 0,
		'Cannot pick weighted operator: no operators provided'
	)

	const weights = computeRawWeights(operators, adaptiveSkillByOperator, t)
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

function computeRawWeights(
	operators: Operator[],
	adaptiveSkillByOperator: AdaptiveSkillMap,
	t: ReturnType<typeof getActiveTuning>
): number[] {
	return operators.map((operator) =>
		Math.max(
			1,
			t.operatorMixing.operatorWeightBase -
				adaptiveSkillByOperator[operator] *
					t.operatorMixing.skillGapDampingFactor
		)
	)
}

/**
 * Returns normalised per-operator selection probabilities (0–1) for the
 * four operators when using "All" in adaptive mode. Useful for showing
 * the current weighting in the simulation UI.
 */
export function getOperatorWeights(skills: AdaptiveSkillMap): OperatorWeights {
	const t = getActiveTuning()
	const weights = computeRawWeights(eligibleAdaptiveAllOperators, skills, t)
	const total = weights.reduce((sum, w) => sum + w, 0)
	const normalized = weights.map((w) => w / total)
	// Array always has exactly 4 elements (one per operator)
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- 4 operators guaranteed
	return normalized as OperatorWeights
}
