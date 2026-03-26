import {
	array,
	boolean,
	check,
	looseObject,
	minLength,
	nullable,
	number,
	object,
	optional,
	pipe,
	safeParse,
	string,
	tuple,
	unknown
} from 'valibot'
import { adaptiveTuning, defaultAdaptiveSkillMap } from './AdaptiveProfile'
import { clampSkill } from '$lib/helpers/adaptiveHelper'
import type { AdaptiveSkillMap } from './AdaptiveProfile'
import { ALL_PUZZLE_CONCEPTS } from './PuzzleConcept'
import type { Puzzle } from './Puzzle'
import type { QuizStats } from './QuizStats'
import type { Quiz } from './Quiz'

export type LastResultsSnapshot = {
	puzzleSet: Puzzle[]
	quizStats: QuizStats
	quiz: Quiz
	preQuizSkill?: AdaptiveSkillMap
	timedOut?: boolean
}

export type PracticeStreakSnapshot = {
	lastDate: string
	streak: number
}

const knownPuzzleConcepts = new Set<string>(ALL_PUZZLE_CONCEPTS)

function isKnownPuzzleConcept(value: string): boolean {
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
		concept: conceptNameSchema,
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
		pipe(
			array(tuple([conceptNameSchema, conceptPerformanceSchema])),
			check(
				(entries) =>
					entries.every(
						([concept, performance]) => concept === performance.concept
					),
				'Expected concept key and payload concept to match'
			)
		)
	)
})

const replayableOperatorSettingsSchema = looseObject({
	range: tuple([finiteNumberSchema, finiteNumberSchema]),
	possibleValues: array(finiteNumberSchema)
})

const replayableQuizSchema = looseObject({
	seed: finiteNumberSchema,
	duration: finiteNumberSchema,
	showPuzzleProgressBar: boolean(),
	allowNegativeAnswers: boolean(),
	puzzleMode: puzzleModeSchema,
	selectedOperator: optional(nullable(operatorExtendedSchema)),
	difficulty: optional(nullable(difficultyModeSchema)),
	operatorSettings: pipe(array(replayableOperatorSettingsSchema), minLength(4))
})

const adaptiveSkillMapSnapshotSchema = pipe(
	array(unknown()),
	check(
		(value: unknown[]) =>
			value.length === adaptiveTuning.adaptiveAllOperatorCount,
		'Invalid adaptive skill map length'
	)
)

const lastResultsSnapshotSchema = looseObject({
	puzzleSet: array(puzzleSchema),
	quizStats: quizStatsSchema,
	quiz: replayableQuizSchema,
	preQuizSkill: optional(adaptiveSkillMapSnapshotSchema),
	timedOut: optional(boolean())
})

const practiceStreakSnapshotSchema = object({
	lastDate: string(),
	streak: nonNegativeFiniteNumberSchema
})

function normalizeAdaptiveSkillMap(rawValues: unknown[]): AdaptiveSkillMap {
	return Array.from(
		{ length: adaptiveTuning.adaptiveAllOperatorCount },
		(_, operator) => clampSkill(Number(rawValues[operator]))
	) as AdaptiveSkillMap
}

function normalizeReplayableQuizNullableFields(quiz: Quiz): Quiz {
	return {
		...quiz,
		selectedOperator: quiz.selectedOperator ?? undefined,
		difficulty: quiz.difficulty ?? undefined
	}
}

export function parseAdaptiveSkillsSnapshot(value: unknown): AdaptiveSkillMap {
	const parsed = safeParse(adaptiveSkillMapSnapshotSchema, value)
	if (!parsed.success) return [...defaultAdaptiveSkillMap] as AdaptiveSkillMap

	return normalizeAdaptiveSkillMap(parsed.output)
}

export function parseLastResultsSnapshot(
	value: unknown
): LastResultsSnapshot | null {
	const parsed = safeParse(lastResultsSnapshotSchema, value)
	if (!parsed.success) return null

	const normalizedQuiz = normalizeReplayableQuizNullableFields(
		parsed.output.quiz as Quiz
	)

	const preQuizSkill = parsed.output.preQuizSkill
	if (preQuizSkill === undefined) {
		return {
			...parsed.output,
			quiz: normalizedQuiz
		} as LastResultsSnapshot
	}

	return {
		...parsed.output,
		quiz: normalizedQuiz,
		preQuizSkill: normalizeAdaptiveSkillMap(preQuizSkill)
	} as LastResultsSnapshot
}

export function parsePracticeStreakSnapshot(
	value: unknown
): PracticeStreakSnapshot {
	const parsed = safeParse(practiceStreakSnapshotSchema, value)
	if (!parsed.success) return { lastDate: '', streak: 0 }

	return {
		lastDate: parsed.output.lastDate,
		streak: Math.floor(parsed.output.streak)
	}
}
