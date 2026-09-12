import { Operator, OperatorExtended } from '#lib/domain/arithmetic/operator.ts'
import {
	mapOperatorTuple,
	type OperatorSkillMap,
	type OperatorWeights
} from '#lib/domain/skill-progression/skillModel.ts'
import { progressionInternals } from '#lib/domain/skill-progression/skillModel.ts'
import { getActiveTuning } from '#lib/domain/skill-progression/adaptiveTuning.ts'
import { invariant } from '../shared/assertions.ts'
import type { DifficultyMode } from '#lib/domain/skill-progression/difficultyMode.ts'
import { isAdaptiveDifficulty } from '#lib/domain/skill-progression/difficultyMode.ts'
import { type Rng, nextFloat, nextInt } from './random.ts'

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
	skillByOperator: OperatorSkillMap
): Operator {
	invariant(
		operator !== undefined,
		'Cannot get operator: parameter is undefined'
	)

	if (operator !== OperatorExtended.All) return operator

	if (!isAdaptiveDifficulty(normalizedDifficulty)) {
		switch (nextInt(rng, 0, progressionInternals.operatorCount - 1)) {
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

	return resolveAdaptiveAllOperator(rng, skillByOperator)
}

function resolveAdaptiveAllOperator(
	rng: Rng,
	skillByOperator: OperatorSkillMap
): Operator {
	return pickWeightedOperatorBySkill(
		rng,
		eligibleAdaptiveAllOperators,
		skillByOperator
	)
}

function pickWeightedOperatorBySkill(
	rng: Rng,
	operators: Operator[],
	skillByOperator: OperatorSkillMap
): Operator {
	const t = getActiveTuning()
	invariant(
		operators.length > 0,
		'Cannot pick weighted operator: no operators provided'
	)

	const weights = computeRawWeights(operators, skillByOperator, t)
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
	skillByOperator: OperatorSkillMap,
	t: ReturnType<typeof getActiveTuning>
): number[] {
	return operators.map((operator) =>
		Math.max(
			1,
			t.operatorMixing.operatorWeightBase -
				skillByOperator[operator] * t.operatorMixing.skillGapDampingFactor
		)
	)
}

/**
 * Returns normalised per-operator selection probabilities (0–1) for the
 * four operators when using "All" in adaptive mode. Useful for showing
 * the current weighting in the simulation UI.
 */
export function getOperatorWeights(skills: OperatorSkillMap): OperatorWeights {
	const t = getActiveTuning()
	const weights = mapOperatorTuple(skills, (skill) =>
		Math.max(
			1,
			t.operatorMixing.operatorWeightBase -
				skill * t.operatorMixing.skillGapDampingFactor
		)
	)
	const total = weights.reduce((sum, w) => sum + w, 0)
	return mapOperatorTuple(weights, (weight) => weight / total)
}
