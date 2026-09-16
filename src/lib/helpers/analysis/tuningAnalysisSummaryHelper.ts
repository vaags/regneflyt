import {
	Operator,
	OperatorExtended,
	type Operator as OperatorValue,
	type OperatorExtended as OperatorExtendedValue
} from '#lib/domain/arithmetic/operator.ts'
import { PuzzleMode } from '#lib/domain/puzzle-generation/puzzleMode.ts'
import type { adaptiveTuning } from '#lib/domain/skill-progression/adaptiveTuning.ts'
import {
	cloneOperatorTuple,
	mapOperatorTuple,
	type OperatorSkillMap
} from '#lib/domain/skill-progression/skillModel.ts'
import {
	deriveAnswerSeed,
	runTuningSimulation,
	type TuningAnalysisStep
} from './tuningAnalysisRunner.ts'
import type {
	AllModeOperatorSummary,
	AllModeSummary,
	AnalysisSummary,
	CompositionSummary,
	DedicatedOperatorSummary,
	Phase,
	PhaseThresholds,
	RateSummary,
	RangeMetric,
	RunSummary,
	StepSummary,
	TuningAnalysisConfig,
	TuningAnalysisOperatorName
} from './tuningAnalysisTypes.ts'

const operators = [
	Operator.Addition,
	Operator.Subtraction,
	Operator.Multiplication,
	Operator.Division
] as const
const operatorValues = {
	addition: OperatorExtended.Addition,
	subtraction: OperatorExtended.Subtraction,
	multiplication: OperatorExtended.Multiplication,
	division: OperatorExtended.Division,
	all: OperatorExtended.All
} satisfies Record<TuningAnalysisOperatorName, OperatorExtendedValue>
const operatorNames = {
	[Operator.Addition]: 'addition',
	[Operator.Subtraction]: 'subtraction',
	[Operator.Multiplication]: 'multiplication',
	[Operator.Division]: 'division'
} satisfies Record<OperatorValue, DedicatedOperatorSummary['operator']>

function round(value: number, digits = 4): number {
	return Number(value.toFixed(digits))
}

function mean(values: number[]): number {
	return values.length === 0
		? 0
		: values.reduce((total, value) => total + value, 0) / values.length
}

function rate(count: number, eligibleCount: number): RateSummary {
	return {
		totalCount: count,
		totalEligibleCount: eligibleCount,
		rate: eligibleCount === 0 ? null : round(count / eligibleCount)
	}
}

function summarizeComposition(steps: TuningAnalysisStep[]): CompositionSummary {
	const subtraction = steps.filter(
		(step) => step.operator === Operator.Subtraction
	)
	const division = steps.filter((step) => step.operator === Operator.Division)
	const addSub = steps.filter(
		(step) =>
			step.operator === Operator.Addition ||
			step.operator === Operator.Subtraction
	)
	return {
		normalMode: rate(
			steps.filter((step) => step.puzzleMode === PuzzleMode.Normal).length,
			steps.length
		),
		alternateMode: rate(
			steps.filter((step) => step.puzzleMode === PuzzleMode.Alternate).length,
			steps.length
		),
		randomMode: rate(
			steps.filter((step) => step.puzzleMode === PuzzleMode.Random).length,
			steps.length
		),
		unknownOperand: rate(
			steps.filter((step) => step.unknownPartIndex !== 2).length,
			steps.length
		),
		negativeSubtraction: rate(
			subtraction.filter((step) => step.hasNegativeSubtractionResult).length,
			subtraction.length
		),
		unknownDivisor: rate(
			division.filter((step) => step.isUnknownDivisor).length,
			division.length
		),
		carryOrBorrow: rate(
			addSub.filter((step) => step.hasCarryOrBorrow).length,
			addSub.length
		)
	}
}

function summarizeSteps(steps: TuningAnalysisStep[]): StepSummary {
	const correct = steps.filter((step) => step.isCorrect)
	const incorrect = steps.filter((step) => !step.isCorrect)
	const totalSkillChange = steps.reduce(
		(total, step) => total + step.skillAfter - step.skillBefore,
		0
	)
	const correctGain = correct.reduce(
		(total, step) => total + Math.max(0, step.skillAfter - step.skillBefore),
		0
	)
	const incorrectPenalty = incorrect.reduce(
		(total, step) => total + Math.max(0, step.skillBefore - step.skillAfter),
		0
	)
	const blockedGainCount = correct.filter(
		(step) => step.difficultyGateBlocked
	).length
	const ceilingClampedGainCount = correct.filter(
		(step) => step.ceilingGainClamped
	).length
	const floorClampedPenaltyCount = incorrect.filter(
		(step) => step.floorPenaltyClamped
	).length
	const cooldownPuzzles = steps.filter((step) => step.isCooldownPuzzle)
	return {
		totalSteps: steps.length,
		totalCorrectAnswers: correct.length,
		totalIncorrectAnswers: incorrect.length,
		totalSkillChange,
		netSkillChangePerPuzzle: round(
			steps.length === 0 ? 0 : totalSkillChange / steps.length
		),
		meanCorrectGain: round(
			correct.length === 0 ? 0 : correctGain / correct.length
		),
		meanIncorrectPenalty: round(
			incorrect.length === 0 ? 0 : incorrectPenalty / incorrect.length
		),
		meanDifficulty: round(mean(steps.map((step) => step.difficulty))),
		meanDifficultyRatio: round(mean(steps.map((step) => step.difficultyRatio))),
		totalBlockedGains: blockedGainCount,
		blockedGainRate: round(
			correct.length === 0 ? 0 : blockedGainCount / correct.length
		),
		totalCeilingClampedGains: ceilingClampedGainCount,
		ceilingClampedGainRate: round(
			correct.length === 0 ? 0 : ceilingClampedGainCount / correct.length
		),
		totalFloorClampedPenalties: floorClampedPenaltyCount,
		floorClampedPenaltyRate: round(
			incorrect.length === 0 ? 0 : floorClampedPenaltyCount / incorrect.length
		),
		totalCooldownPuzzles: cooldownPuzzles.length,
		meanCooldownDifficulty: round(
			mean(cooldownPuzzles.map((step) => step.difficulty))
		),
		composition: summarizeComposition(steps)
	}
}

function phaseFor(skill: number, thresholds: PhaseThresholds): Phase {
	if (skill < thresholds.calibration) return 'early'
	if (skill < thresholds.taper) return 'mid'
	return 'late'
}

function summarizePhases(
	steps: TuningAnalysisStep[],
	thresholds: PhaseThresholds
): Record<Phase, StepSummary> {
	const grouped: Record<Phase, TuningAnalysisStep[]> = {
		early: [],
		mid: [],
		late: []
	}
	for (const step of steps)
		grouped[phaseFor(step.skillBefore, thresholds)].push(step)
	return {
		early: summarizeSteps(grouped.early),
		mid: summarizeSteps(grouped.mid),
		late: summarizeSteps(grouped.late)
	}
}

function summarizeAllModeOperators(
	steps: TuningAnalysisStep[],
	startingSkills: OperatorSkillMap
): AllModeOperatorSummary[] {
	const finalSkills = steps.at(-1)?.allSkills ?? startingSkills
	return operators.map((operator) => {
		const operatorSteps = steps.filter((step) => step.operator === operator)
		return {
			operator: operatorNames[operator],
			selectionShare: round(
				steps.length === 0 ? 0 : operatorSteps.length / steps.length
			),
			startingSkill: startingSkills[operator],
			finalSkill: finalSkills[operator],
			...summarizeSteps(operatorSteps)
		}
	})
}

export function runAnalysis(input: {
	tuning: typeof adaptiveTuning
	config: TuningAnalysisConfig
	phaseThresholds: PhaseThresholds
}): RunSummary[] {
	return input.config.seeds.flatMap((seed) =>
		input.config.operators.map((operator) => {
			const answerSeed = deriveAnswerSeed(seed)
			const steps = runTuningSimulation({
				tuning: input.tuning,
				startingSkills: cloneOperatorTuple(input.config.startingSkills),
				operator: operatorValues[operator],
				steps: input.config.steps,
				accuracy: input.config.accuracy,
				responseSeconds: input.config.responseSeconds,
				puzzleSeed: seed,
				answerSeed
			})
			return {
				seed,
				answerSeed,
				operator,
				finalSkills:
					steps.at(-1)?.allSkills ??
					cloneOperatorTuple(input.config.startingSkills),
				...summarizeSteps(steps),
				phases: summarizePhases(steps, input.phaseThresholds),
				...(operator === 'all'
					? {
							allModeOperators: summarizeAllModeOperators(
								steps,
								input.config.startingSkills
							)
						}
					: {})
			}
		})
	)
}

function combineRates(values: RateSummary[]): RateSummary {
	return rate(
		values.reduce((total, value) => total + value.totalCount, 0),
		values.reduce((total, value) => total + value.totalEligibleCount, 0)
	)
}

function averageSteps(values: StepSummary[]): StepSummary {
	const totalSteps = values.reduce(
		(total, value) => total + value.totalSteps,
		0
	)
	const totalCorrectAnswers = values.reduce(
		(total, value) => total + value.totalCorrectAnswers,
		0
	)
	const totalIncorrectAnswers = values.reduce(
		(total, value) => total + value.totalIncorrectAnswers,
		0
	)
	const totalSkillChange = values.reduce(
		(total, value) => total + value.totalSkillChange,
		0
	)
	const totalBlockedGains = values.reduce(
		(total, value) => total + value.totalBlockedGains,
		0
	)
	const totalCeilingClampedGains = values.reduce(
		(total, value) => total + value.totalCeilingClampedGains,
		0
	)
	const totalFloorClampedPenalties = values.reduce(
		(total, value) => total + value.totalFloorClampedPenalties,
		0
	)
	const totalCooldownPuzzles = values.reduce(
		(total, value) => total + value.totalCooldownPuzzles,
		0
	)

	return {
		totalSteps,
		totalCorrectAnswers,
		totalIncorrectAnswers,
		totalSkillChange,
		netSkillChangePerPuzzle: round(
			totalSteps === 0 ? 0 : totalSkillChange / totalSteps
		),
		meanCorrectGain: round(
			totalCorrectAnswers === 0
				? 0
				: values.reduce(
						(total, value) =>
							total + value.meanCorrectGain * value.totalCorrectAnswers,
						0
					) / totalCorrectAnswers
		),
		meanIncorrectPenalty: round(
			totalIncorrectAnswers === 0
				? 0
				: values.reduce(
						(total, value) =>
							total + value.meanIncorrectPenalty * value.totalIncorrectAnswers,
						0
					) / totalIncorrectAnswers
		),
		meanDifficulty: round(
			totalSteps === 0
				? 0
				: values.reduce(
						(total, value) => total + value.meanDifficulty * value.totalSteps,
						0
					) / totalSteps
		),
		meanDifficultyRatio: round(
			totalSteps === 0
				? 0
				: values.reduce(
						(total, value) =>
							total + value.meanDifficultyRatio * value.totalSteps,
						0
					) / totalSteps
		),
		totalBlockedGains,
		blockedGainRate: round(
			totalCorrectAnswers === 0 ? 0 : totalBlockedGains / totalCorrectAnswers
		),
		totalCeilingClampedGains,
		ceilingClampedGainRate: round(
			totalCorrectAnswers === 0
				? 0
				: totalCeilingClampedGains / totalCorrectAnswers
		),
		totalFloorClampedPenalties,
		floorClampedPenaltyRate: round(
			totalIncorrectAnswers === 0
				? 0
				: totalFloorClampedPenalties / totalIncorrectAnswers
		),
		totalCooldownPuzzles,
		meanCooldownDifficulty: round(
			totalCooldownPuzzles === 0
				? 0
				: values.reduce(
						(total, value) =>
							total + value.meanCooldownDifficulty * value.totalCooldownPuzzles,
						0
					) / totalCooldownPuzzles
		),
		composition: {
			normalMode: combineRates(
				values.map((value) => value.composition.normalMode)
			),
			alternateMode: combineRates(
				values.map((value) => value.composition.alternateMode)
			),
			randomMode: combineRates(
				values.map((value) => value.composition.randomMode)
			),
			unknownOperand: combineRates(
				values.map((value) => value.composition.unknownOperand)
			),
			negativeSubtraction: combineRates(
				values.map((value) => value.composition.negativeSubtraction)
			),
			unknownDivisor: combineRates(
				values.map((value) => value.composition.unknownDivisor)
			),
			carryOrBorrow: combineRates(
				values.map((value) => value.composition.carryOrBorrow)
			)
		}
	}
}

function averagePhases(runs: RunSummary[]): Record<Phase, StepSummary> {
	return {
		early: averageSteps(runs.map((run) => run.phases.early)),
		mid: averageSteps(runs.map((run) => run.phases.mid)),
		late: averageSteps(runs.map((run) => run.phases.late))
	}
}

function range(values: number[]): RangeMetric {
	return values.length === 0
		? { mean: 0, min: 0, max: 0 }
		: {
				mean: round(mean(values)),
				min: Math.min(...values),
				max: Math.max(...values)
			}
}

function getAllModeOperator(
	run: RunSummary,
	operator: OperatorValue
): AllModeOperatorSummary {
	const result = run.allModeOperators?.find(
		(value) => value.operator === operatorNames[operator]
	)
	if (result === undefined) {
		throw new Error(`Missing ${operatorNames[operator]} all-mode summary`)
	}
	return result
}

function summarizeDedicated(
	runs: RunSummary[],
	startingSkills: OperatorSkillMap
): DedicatedOperatorSummary[] {
	return operators.flatMap((operator) => {
		const operatorName = operatorNames[operator]
		const relevant = runs.filter((run) => run.operator === operatorName)
		if (relevant.length === 0) return []
		return [
			{
				operator: operatorName,
				runs: relevant.length,
				startingSkill: startingSkills[operator],
				finalSkill: round(
					mean(relevant.map((run) => run.finalSkills[operator]))
				),
				finalSkillRange: range(
					relevant.map((run) => run.finalSkills[operator])
				),
				...averageSteps(relevant),
				phases: averagePhases(relevant)
			}
		]
	})
}

function summarizeAllMode(
	runs: RunSummary[],
	startingSkills: OperatorSkillMap
): AllModeSummary | undefined {
	const relevant = runs.filter((run) => run.operator === 'all')
	if (relevant.length === 0) return undefined
	const finalSkills = mapOperatorTuple(startingSkills, (_, operator) =>
		round(mean(relevant.map((run) => run.finalSkills[operator])))
	)
	return {
		runs: relevant.length,
		startingSkills: cloneOperatorTuple(startingSkills),
		finalSkills,
		meanFinalSkill: round(mean(finalSkills)),
		...averageSteps(relevant),
		phases: averagePhases(relevant),
		operators: operators.map((operator) => {
			const values = relevant.map((run) => getAllModeOperator(run, operator))
			return {
				operator: operatorNames[operator],
				selectionShare: round(
					mean(values.map((value) => value.selectionShare))
				),
				startingSkill: startingSkills[operator],
				finalSkill: round(mean(values.map((value) => value.finalSkill))),
				...averageSteps(values)
			}
		}),
		seedRange: {
			meanFinalSkill: range(relevant.map((run) => mean(run.finalSkills))),
			meanDifficulty: range(relevant.map((run) => run.meanDifficulty)),
			blockedGainRate: range(relevant.map((run) => run.blockedGainRate))
		}
	}
}

export function summarize(
	runs: RunSummary[],
	config: TuningAnalysisConfig
): AnalysisSummary {
	const allOperator = summarizeAllMode(runs, config.startingSkills)
	return {
		dedicated: summarizeDedicated(runs, config.startingSkills),
		...(allOperator === undefined ? {} : { allOperator })
	}
}
