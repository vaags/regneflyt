import {
	array,
	boolean,
	check,
	nullable,
	number,
	object,
	optional,
	picklist,
	pipe,
	strictObject,
	tuple,
	unknown,
	type StrictObjectSchema
} from 'valibot'
import {
	adaptiveDifficultyId,
	customDifficultyId
} from '#lib/domain/skill-progression/difficultyMode.ts'
import type { adaptiveTuning } from '#lib/domain/skill-progression/adaptiveTuning.ts'
import { progressionInternals } from '#lib/domain/skill-progression/skillModel.ts'
import { Operator, OperatorExtended } from '#lib/domain/arithmetic/operator.ts'
import { PuzzleMode } from '#lib/domain/puzzle-generation/puzzleMode.ts'

const finiteNumberSchema = pipe(
	number(),
	check((value: number) => Number.isFinite(value), 'Expected finite number')
)

const nonNegativeFiniteNumberSchema = pipe(
	finiteNumberSchema,
	check((value: number) => value >= 0, 'Expected non-negative number')
)

const nonNegativeIntegerSchema = pipe(
	nonNegativeFiniteNumberSchema,
	check((value: number) => Number.isInteger(value), 'Expected integer')
)

// picklist (not check) so the parsed output narrows to the domain union type.
const operatorSchema = picklist([
	Operator.Addition,
	Operator.Subtraction,
	Operator.Multiplication,
	Operator.Division
])

const operatorExtendedSchema = picklist([
	OperatorExtended.Addition,
	OperatorExtended.Subtraction,
	OperatorExtended.Multiplication,
	OperatorExtended.Division,
	OperatorExtended.All
])

const difficultyModeSchema = picklist([
	customDifficultyId,
	adaptiveDifficultyId
])

const unknownPartIndexSchema = picklist([0, 1, 2])

const puzzleModeSchema = picklist([
	PuzzleMode.Normal,
	PuzzleMode.Alternate,
	PuzzleMode.Random
])

const puzzlePartSchema = object({
	generatedValue: finiteNumberSchema,
	userDefinedValue: optional(nullable(finiteNumberSchema))
})

const puzzleSchema = object({
	parts: tuple([puzzlePartSchema, puzzlePartSchema, puzzlePartSchema]),
	duration: finiteNumberSchema,
	isCorrect: optional(nullable(boolean())),
	operator: operatorSchema,
	unknownPartIndex: unknownPartIndexSchema,
	puzzleMode: optional(puzzleModeSchema)
})

const quizStatsSchema = object({
	correctAnswerCount: nonNegativeIntegerSchema,
	correctAnswerPercentage: pipe(
		finiteNumberSchema,
		check(
			(value: number) => value >= 0 && value <= 100,
			'Expected percentage in [0,100]'
		)
	),
	starCount: nonNegativeIntegerSchema
})

const replayableOperatorSettingsSchema = object({
	range: tuple([finiteNumberSchema, finiteNumberSchema]),
	possibleValues: array(finiteNumberSchema)
})

export const operatorSkillMapSnapshotSchema = pipe(
	array(unknown()),
	check(
		(value) => value.length === progressionInternals.operatorCount,
		'Invalid operator skill map length'
	)
)

const replayableQuizSchema = object({
	seed: finiteNumberSchema,
	duration: finiteNumberSchema,
	showPuzzleProgressBar: boolean(),
	allowNegativeAnswers: boolean(),
	skillByOperator: optional(operatorSkillMapSnapshotSchema),
	adaptiveSkillByOperator: optional(operatorSkillMapSnapshotSchema),
	puzzleMode: puzzleModeSchema,
	selectedOperator: optional(nullable(operatorExtendedSchema)),
	difficulty: optional(nullable(difficultyModeSchema)),
	operatorSettings: tuple([
		replayableOperatorSettingsSchema,
		replayableOperatorSettingsSchema,
		replayableOperatorSettingsSchema,
		replayableOperatorSettingsSchema
	])
})

export const lastResultsSnapshotSchema = object({
	puzzleSet: array(puzzleSchema),
	quizStats: quizStatsSchema,
	quiz: replayableQuizSchema,
	preQuizSkill: optional(operatorSkillMapSnapshotSchema)
})

const numericPairSchema = tuple([finiteNumberSchema, finiteNumberSchema])

type TuningKnob = number | readonly [number, number]
type TuningGroup = Readonly<Record<string, TuningKnob>>

type TuningGroupEntries<TGroup extends TuningGroup> = {
	[TKnob in keyof TGroup]: TGroup[TKnob] extends readonly [number, number]
		? typeof numericPairSchema
		: typeof finiteNumberSchema
}

// Ties the schema below to adaptiveTuning: adding, removing or retyping a knob
// there fails to compile here until this schema is updated to match.
type AdaptiveTuningEntries = {
	[TGroup in keyof typeof adaptiveTuning]: StrictObjectSchema<
		TuningGroupEntries<(typeof adaptiveTuning)[TGroup]>,
		undefined
	>
}

export const adaptiveTuningSnapshotSchema: StrictObjectSchema<
	AdaptiveTuningEntries,
	undefined
> = strictObject({
	skillBounds: strictObject({
		minSkill: finiteNumberSchema,
		maxSkill: finiteNumberSchema
	}),
	operatorMixing: strictObject({
		operatorWeightBase: finiteNumberSchema,
		skillGapDampingFactor: finiteNumberSchema,
		weakOperatorMinDifficultyBoost: finiteNumberSchema,
		weakOperatorGapThreshold: finiteNumberSchema
	}),
	timing: strictObject({
		maxDurationSeconds: finiteNumberSchema,
		maxDurationAtMaxSkill: finiteNumberSchema
	}),
	penalties: strictObject({
		basePenalty: finiteNumberSchema,
		slownessPenaltyBonus: finiteNumberSchema,
		lowSkillPenaltyCapThreshold: finiteNumberSchema,
		lowSkillPenaltyCapFraction: finiteNumberSchema,
		cooldownSteps: finiteNumberSchema,
		cooldownRangeReduction: finiteNumberSchema
	}),
	gains: strictObject({
		baseSkillGain: finiteNumberSchema,
		speedGainRange: numericPairSchema,
		confidenceSpeedBands: numericPairSchema,
		confidenceEffect: finiteNumberSchema
	}),
	streak: strictObject({
		streakBoostThreshold: finiteNumberSchema,
		streakBoostMultiplier: finiteNumberSchema,
		streakBoostMaxSpeedFraction: finiteNumberSchema
	}),
	calibration: strictObject({
		calibrationThreshold: finiteNumberSchema,
		calibrationMaxBoost: finiteNumberSchema,
		taperThreshold: finiteNumberSchema,
		taperMinGain: finiteNumberSchema
	}),
	additionSubtraction: strictObject({
		rangeBase: finiteNumberSchema,
		rangeScale: finiteNumberSchema,
		addSubExponent: finiteNumberSchema,
		lowerBoundScale: finiteNumberSchema,
		secondOperandSkillLag: finiteNumberSchema,
		carryBorrowSkillThreshold: finiteNumberSchema
	}),
	thresholds: strictObject({
		minDifficultyRatio: finiteNumberSchema,
		difficultyWindowOvershoot: finiteNumberSchema,
		minWindowSize: finiteNumberSchema
	}),
	multiplicationDivision: strictObject({
		tablesBase: finiteNumberSchema,
		tablesScale: finiteNumberSchema,
		tablesExponent: finiteNumberSchema,
		tablesDropScale: finiteNumberSchema,
		factorMin: finiteNumberSchema,
		factorMax: finiteNumberSchema,
		factorMinAtMaxSkill: finiteNumberSchema,
		factorMaxAtMinSkill: finiteNumberSchema
	}),
	puzzleMode: strictObject({
		alternateMidpoint: finiteNumberSchema,
		randomMidpoint: finiteNumberSchema,
		transitionSpread: finiteNumberSchema
	}),
	algebraicRollout: strictObject({
		algebraicSkillOffset: finiteNumberSchema,
		negativeSubStartSkill: finiteNumberSchema,
		negativeSubFullSkill: finiteNumberSchema,
		divisorUnknownStartSkill: finiteNumberSchema,
		divisorUnknownFullSkill: finiteNumberSchema,
		divisorUnknownProbability: finiteNumberSchema
	}),
	difficultyScoring: strictObject({
		minorOperandWeight: finiteNumberSchema,
		carryBorrowBoost: finiteNumberSchema,
		noCarryDiscount: finiteNumberSchema,
		maxTableDifficultyScore: finiteNumberSchema,
		addSubBase: finiteNumberSchema,
		addScale: finiteNumberSchema,
		subScale: finiteNumberSchema,
		factorWeight: finiteNumberSchema,
		identityFactorMultiplier: finiteNumberSchema,
		mulDivExponent: finiteNumberSchema
	})
})
