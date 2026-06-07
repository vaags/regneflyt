import {
	array,
	boolean,
	check,
	looseObject,
	nullable,
	number,
	object,
	optional,
	pipe,
	string,
	tuple,
	unknown
} from 'valibot'
import { adaptiveInternals } from './AdaptiveProfile'
import { ALL_PUZZLE_CONCEPTS } from './PuzzleConcept'
import type { PuzzleConcept } from './PuzzleConcept'

const knownPuzzleConcepts = new Set<string>(ALL_PUZZLE_CONCEPTS)

export function isKnownPuzzleConcept(value: string): value is PuzzleConcept {
	return knownPuzzleConcepts.has(value)
}

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

const integerSchema = pipe(
	finiteNumberSchema,
	check((value: number) => Number.isInteger(value), 'Expected integer')
)

const operatorSchema = pipe(
	integerSchema,
	check(
		(value: number) => value === 0 || value === 1 || value === 2 || value === 3,
		'Expected supported operator'
	)
)

const operatorExtendedSchema = pipe(
	integerSchema,
	check(
		(value: number) =>
			value === 0 || value === 1 || value === 2 || value === 3 || value === 4,
		'Expected supported operator'
	)
)

const difficultyModeSchema = pipe(
	integerSchema,
	check(
		(value: number) => value === 0 || value === 1,
		'Expected supported difficulty mode'
	)
)

const unknownPartIndexSchema = pipe(
	finiteNumberSchema,
	check((value: number) => Number.isInteger(value), 'Expected integer index'),
	check(
		(value: number) => value === 0 || value === 1 || value === 2,
		'Expected unknownPartIndex in [0,1,2]'
	)
)

const puzzleModeSchema = pipe(
	finiteNumberSchema,
	check(
		(value: number) => Number.isInteger(value),
		'Expected integer puzzle mode'
	),
	check(
		(value: number) => value === 0 || value === 1 || value === 2,
		'Expected supported puzzle mode'
	)
)

const puzzlePartSchema = object({
	generatedValue: finiteNumberSchema,
	userDefinedValue: optional(nullable(finiteNumberSchema))
})

const conceptNameSchema = pipe(
	string(),
	check(isKnownPuzzleConcept, 'Expected known puzzle concept')
)

const puzzleSchema = looseObject({
	parts: tuple([puzzlePartSchema, puzzlePartSchema, puzzlePartSchema]),
	duration: finiteNumberSchema,
	isCorrect: optional(nullable(boolean())),
	operator: operatorSchema,
	unknownPartIndex: unknownPartIndexSchema,
	puzzleMode: optional(puzzleModeSchema)
})

const conceptPerformanceSchema = pipe(
	looseObject({
		correct: nonNegativeIntegerSchema,
		total: nonNegativeIntegerSchema,
		avgDuration: nonNegativeFiniteNumberSchema
	}),
	check(
		(value) => value.correct <= value.total,
		'Expected concept correct <= total'
	)
)

const quizStatsSchema = looseObject({
	correctAnswerCount: nonNegativeIntegerSchema,
	correctAnswerPercentage: pipe(
		finiteNumberSchema,
		check(
			(value: number) => value >= 0 && value <= 100,
			'Expected percentage in [0,100]'
		)
	),
	starCount: nonNegativeIntegerSchema,
	conceptStats: optional(
		array(tuple([conceptNameSchema, conceptPerformanceSchema]))
	)
})

const quizHistoryEntrySchema = looseObject({
	completedAt: nonNegativeIntegerSchema,
	conceptStats: array(tuple([conceptNameSchema, conceptPerformanceSchema]))
})

export const quizHistorySnapshotSchema = pipe(
	array(quizHistoryEntrySchema),
	check(
		(value) => value.length <= 50,
		'Expected quiz history snapshot with at most 50 entries'
	)
)

const replayableOperatorSettingsSchema = looseObject({
	range: tuple([finiteNumberSchema, finiteNumberSchema]),
	possibleValues: array(finiteNumberSchema)
})

export const adaptiveSkillMapSnapshotSchema = pipe(
	array(unknown()),
	check(
		(value: unknown[]) => value.length === adaptiveInternals.operatorCount,
		'Invalid adaptive skill map length'
	)
)

const replayableQuizSchema = looseObject({
	seed: finiteNumberSchema,
	duration: finiteNumberSchema,
	showPuzzleProgressBar: boolean(),
	allowNegativeAnswers: boolean(),
	adaptiveSkillByOperator: optional(adaptiveSkillMapSnapshotSchema),
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

export const lastResultsSnapshotSchema = looseObject({
	puzzleSet: array(puzzleSchema),
	quizStats: quizStatsSchema,
	quiz: replayableQuizSchema,
	preQuizSkill: optional(adaptiveSkillMapSnapshotSchema)
})
