import type { adaptiveTuning } from '#lib/domain/skill-progression/adaptiveTuning.ts'
import { mapOperatorTuple } from '#lib/domain/skill-progression/skillModel.ts'
import type {
	AllModeDelta,
	AllModeSummary,
	AnalysisDelta,
	AnalysisSummary,
	DedicatedOperatorDelta,
	DedicatedOperatorSummary,
	RateSummary,
	StepDelta,
	StepSummary,
	TuningChange,
	TuningLeafValue
} from './tuningAnalysisTypes.ts'

function round(value: number, digits = 4): number {
	return Number(value.toFixed(digits))
}

export function cloneTuning(
	tuning: typeof adaptiveTuning
): typeof adaptiveTuning {
	return structuredClone(tuning)
}

function collectTuningLeaves(
	value: unknown,
	prefix = '',
	leaves = new Map<string, TuningLeafValue>()
): Map<string, TuningLeafValue> {
	if (typeof value === 'number') {
		leaves.set(prefix, value)
		return leaves
	}
	if (Array.isArray(value)) {
		if (!value.every((item): item is number => typeof item === 'number')) {
			throw new Error(`Invalid tuning array at ${prefix}`)
		}
		leaves.set(prefix, [...value])
		return leaves
	}
	if (typeof value !== 'object' || value === null) {
		throw new Error(`Invalid tuning value at ${prefix || '<root>'}`)
	}
	for (const [key, nestedValue] of Object.entries(value)) {
		collectTuningLeaves(
			nestedValue,
			prefix === '' ? key : `${prefix}.${key}`,
			leaves
		)
	}
	return leaves
}

export function tuningChanges(
	baseline: typeof adaptiveTuning,
	candidate: typeof adaptiveTuning
): TuningChange[] {
	const changes: TuningChange[] = []
	const baselineLeaves = collectTuningLeaves(baseline)
	const candidateLeaves = collectTuningLeaves(candidate)
	for (const [path, baselineValue] of baselineLeaves) {
		const candidateValue = candidateLeaves.get(path)
		if (candidateValue === undefined) {
			throw new Error(`Missing candidate tuning value at ${path}`)
		}
		if (JSON.stringify(baselineValue) === JSON.stringify(candidateValue))
			continue
		changes.push({ path, baseline: baselineValue, candidate: candidateValue })
	}
	return changes
}

function subtractRate(
	baseline: RateSummary,
	candidate: RateSummary
): number | null {
	return baseline.rate === null || candidate.rate === null
		? null
		: round(candidate.rate - baseline.rate)
}

function subtractSteps(
	baseline: StepSummary,
	candidate: StepSummary
): StepDelta {
	return {
		totalSteps: candidate.totalSteps - baseline.totalSteps,
		totalCorrectAnswers:
			candidate.totalCorrectAnswers - baseline.totalCorrectAnswers,
		totalIncorrectAnswers:
			candidate.totalIncorrectAnswers - baseline.totalIncorrectAnswers,
		totalSkillChange: round(
			candidate.totalSkillChange - baseline.totalSkillChange
		),
		netSkillChangePerPuzzle: round(
			candidate.netSkillChangePerPuzzle - baseline.netSkillChangePerPuzzle
		),
		meanCorrectGain: round(
			candidate.meanCorrectGain - baseline.meanCorrectGain
		),
		meanIncorrectPenalty: round(
			candidate.meanIncorrectPenalty - baseline.meanIncorrectPenalty
		),
		meanDifficulty: round(candidate.meanDifficulty - baseline.meanDifficulty),
		meanDifficultyRatio: round(
			candidate.meanDifficultyRatio - baseline.meanDifficultyRatio
		),
		totalBlockedGains: candidate.totalBlockedGains - baseline.totalBlockedGains,
		blockedGainRate: round(
			candidate.blockedGainRate - baseline.blockedGainRate
		),
		totalCeilingClampedGains:
			candidate.totalCeilingClampedGains - baseline.totalCeilingClampedGains,
		ceilingClampedGainRate: round(
			candidate.ceilingClampedGainRate - baseline.ceilingClampedGainRate
		),
		totalFloorClampedPenalties:
			candidate.totalFloorClampedPenalties -
			baseline.totalFloorClampedPenalties,
		floorClampedPenaltyRate: round(
			candidate.floorClampedPenaltyRate - baseline.floorClampedPenaltyRate
		),
		totalCooldownPuzzles:
			candidate.totalCooldownPuzzles - baseline.totalCooldownPuzzles,
		meanCooldownDifficulty: round(
			candidate.meanCooldownDifficulty - baseline.meanCooldownDifficulty
		),
		composition: {
			normalMode: subtractRate(
				baseline.composition.normalMode,
				candidate.composition.normalMode
			),
			alternateMode: subtractRate(
				baseline.composition.alternateMode,
				candidate.composition.alternateMode
			),
			randomMode: subtractRate(
				baseline.composition.randomMode,
				candidate.composition.randomMode
			),
			unknownOperand: subtractRate(
				baseline.composition.unknownOperand,
				candidate.composition.unknownOperand
			),
			negativeSubtraction: subtractRate(
				baseline.composition.negativeSubtraction,
				candidate.composition.negativeSubtraction
			),
			unknownDivisor: subtractRate(
				baseline.composition.unknownDivisor,
				candidate.composition.unknownDivisor
			),
			carryOrBorrow: subtractRate(
				baseline.composition.carryOrBorrow,
				candidate.composition.carryOrBorrow
			)
		}
	}
}

function subtractDedicated(
	baseline: DedicatedOperatorSummary,
	candidate: DedicatedOperatorSummary
): DedicatedOperatorDelta {
	return {
		operator: candidate.operator,
		finalSkill: round(candidate.finalSkill - baseline.finalSkill),
		...subtractSteps(baseline, candidate),
		phases: {
			early: subtractSteps(baseline.phases.early, candidate.phases.early),
			mid: subtractSteps(baseline.phases.mid, candidate.phases.mid),
			late: subtractSteps(baseline.phases.late, candidate.phases.late)
		}
	}
}

function subtractAllMode(
	baseline: AllModeSummary,
	candidate: AllModeSummary
): AllModeDelta {
	return {
		finalSkills: mapOperatorTuple(candidate.finalSkills, (value, index) =>
			round(value - baseline.finalSkills[index])
		),
		meanFinalSkill: round(candidate.meanFinalSkill - baseline.meanFinalSkill),
		...subtractSteps(baseline, candidate),
		phases: {
			early: subtractSteps(baseline.phases.early, candidate.phases.early),
			mid: subtractSteps(baseline.phases.mid, candidate.phases.mid),
			late: subtractSteps(baseline.phases.late, candidate.phases.late)
		},
		operators: candidate.operators.map((value, index) => {
			const base = baseline.operators[index]
			if (base === undefined) {
				throw new Error('Missing baseline operator summary')
			}
			return {
				operator: value.operator,
				selectionShare: round(value.selectionShare - base.selectionShare),
				finalSkill: round(value.finalSkill - base.finalSkill),
				...subtractSteps(base, value)
			}
		})
	}
}

export function subtractSummary(
	baseline: AnalysisSummary,
	candidate: AnalysisSummary
): AnalysisDelta {
	const dedicated = candidate.dedicated.map((value) => {
		const base = baseline.dedicated.find(
			(entry) => entry.operator === value.operator
		)
		if (base === undefined)
			throw new Error('Missing baseline dedicated summary')
		return subtractDedicated(base, value)
	})
	if (
		baseline.allOperator === undefined ||
		candidate.allOperator === undefined
	) {
		return { dedicated }
	}
	return {
		dedicated,
		allOperator: subtractAllMode(baseline.allOperator, candidate.allOperator)
	}
}
