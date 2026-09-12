// One skill value (0–100) per operator: [+, −, ×, ÷].
// Tracked separately so each operator progresses at its own pace.
// Shared across both difficulty modes so every quiz affects the same skill.
export type OperatorTuple<T> = [
	addition: T,
	subtraction: T,
	multiplication: T,
	division: T
]

export type OperatorTupleIndex = 0 | 1 | 2 | 3

export type OperatorSkillMap = OperatorTuple<number>

export const defaultOperatorSkillMap: OperatorSkillMap = [0, 0, 0, 0]

// Normalised per-operator selection probabilities (0–1).
// Same shape as OperatorSkillMap but represents weight distribution, not skill.
export type OperatorWeights = OperatorTuple<number>

export function mapOperatorTuple<T, U>(
	values: OperatorTuple<T>,
	mapValue: (value: T, index: OperatorTupleIndex) => U
): OperatorTuple<U> {
	return [
		mapValue(values[0], 0),
		mapValue(values[1], 1),
		mapValue(values[2], 2),
		mapValue(values[3], 3)
	]
}

export function cloneOperatorTuple<T>(
	values: OperatorTuple<T>
): OperatorTuple<T> {
	return [values[0], values[1], values[2], values[3]]
}

// A [min, max] numeric range used for operand bounds, factor limits, etc.
export type OperandRange = [min: number, max: number]

// Fixed structural constants determined by the data model rather than tuning.
export const progressionInternals = {
	operatorCount: 4,
	minDurationSeconds: 0,
	tablesWeightPrecision: 20
} as const
