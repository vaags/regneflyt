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
	safeParse,
	string,
	tuple,
	unknown
} from 'valibot'
import { adaptiveTuning, defaultAdaptiveSkillMap } from './AdaptiveProfile'
import { clampSkill } from '$lib/helpers/adaptiveHelper'
import type { DifficultyMode, AdaptiveSkillMap } from './AdaptiveProfile'
import { ALL_PUZZLE_CONCEPTS } from './PuzzleConcept'
import type { PuzzleConcept } from './PuzzleConcept'
import type { Puzzle } from './Puzzle'
import type { ConceptPerformanceData, QuizStats } from './QuizStats'
import type { Quiz } from './Quiz'
import { Operator, OperatorExtended } from '$lib/constants/Operator'
import type { OperatorExtended as OperatorExtendedType } from '$lib/constants/Operator'
import { QuizState } from '$lib/constants/QuizState'
import { PuzzleMode } from '$lib/constants/PuzzleMode'
import type { PuzzleMode as PuzzleModeType } from '$lib/constants/PuzzleMode'

export type LastResultsSnapshot = {
	puzzleSet: Puzzle[]
	quizStats: QuizStats
	quiz: Quiz
	preQuizSkill?: AdaptiveSkillMap
}

type ReplayableOperatorSettingsSnapshot = {
	range: [number, number]
	possibleValues: number[]
}

type ReplayableQuizSnapshot = {
	seed: number
	duration: number
	showPuzzleProgressBar: boolean
	allowNegativeAnswers: boolean
	adaptiveSkillByOperator: AdaptiveSkillMap
	puzzleMode: PuzzleModeType
	selectedOperator?: OperatorExtendedType
	difficulty?: DifficultyMode
	operatorSettings: [
		ReplayableOperatorSettingsSnapshot,
		ReplayableOperatorSettingsSnapshot,
		ReplayableOperatorSettingsSnapshot,
		ReplayableOperatorSettingsSnapshot
	]
}

type ReplayableQuizRaw = {
	seed: number
	duration: number
	showPuzzleProgressBar: boolean
	allowNegativeAnswers: boolean
	adaptiveSkillByOperator?: unknown[] | undefined
	puzzleMode: number
	selectedOperator?: number | null | undefined
	difficulty?: number | null | undefined
	operatorSettings: ReplayableQuizSnapshot['operatorSettings']
}

type StoredPuzzleRaw = {
	parts: [
		{ generatedValue: number; userDefinedValue?: number | null | undefined },
		{ generatedValue: number; userDefinedValue?: number | null | undefined },
		{ generatedValue: number; userDefinedValue?: number | null | undefined }
	]
	duration: number
	isCorrect?: boolean | null | undefined
	operator: number
	unknownPartIndex: number
	puzzleMode?: number | undefined
}

const knownPuzzleConcepts = new Set<string>(ALL_PUZZLE_CONCEPTS)

function isKnownPuzzleConcept(value: string): value is PuzzleConcept {
	return knownPuzzleConcepts.has(value)
}

function toAdaptiveSkillMap(rawValues: ArrayLike<unknown>): AdaptiveSkillMap {
	return [
		clampSkill(Number(rawValues[0])),
		clampSkill(Number(rawValues[1])),
		clampSkill(Number(rawValues[2])),
		clampSkill(Number(rawValues[3]))
	]
}

function normalizeStoredPuzzleParts(
	parts: StoredPuzzleRaw['parts']
): Puzzle['parts'] {
	return [
		{
			generatedValue: parts[0].generatedValue,
			userDefinedValue: parts[0].userDefinedValue ?? undefined
		},
		{
			generatedValue: parts[1].generatedValue,
			userDefinedValue: parts[1].userDefinedValue ?? undefined
		},
		{
			generatedValue: parts[2].generatedValue,
			userDefinedValue: parts[2].userDefinedValue ?? undefined
		}
	]
}

function normalizeConceptPerformanceData(
	conceptStats: NonNullable<
		NonNullable<Parameters<typeof normalizeQuizStats>[0]['conceptStats']>
	>
): ConceptPerformanceData {
	const normalized: ConceptPerformanceData = []

	for (const [concept, performance] of conceptStats) {
		if (!isKnownPuzzleConcept(concept)) continue

		normalized.push([
			concept,
			{
				correct: performance.correct,
				total: performance.total,
				avgDuration: performance.avgDuration
			}
		])
	}

	return normalized
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

const replayableOperatorSettingsSchema = looseObject({
	range: tuple([finiteNumberSchema, finiteNumberSchema]),
	possibleValues: array(finiteNumberSchema)
})

const adaptiveSkillMapSnapshotSchema = pipe(
	array(unknown()),
	check(
		(value: unknown[]) =>
			value.length === adaptiveTuning.adaptiveAllOperatorCount,
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

const lastResultsSnapshotSchema = looseObject({
	puzzleSet: array(puzzleSchema),
	quizStats: quizStatsSchema,
	quiz: replayableQuizSchema,
	preQuizSkill: optional(adaptiveSkillMapSnapshotSchema)
})

function normalizeAdaptiveSkillMap(rawValues: unknown[]): AdaptiveSkillMap {
	return toAdaptiveSkillMap(rawValues)
}

function normalizeReplayableQuizSnapshot(
	quiz: ReplayableQuizRaw
): ReplayableQuizSnapshot {
	const normalizedQuiz: ReplayableQuizSnapshot = {
		seed: quiz.seed,
		duration: quiz.duration,
		showPuzzleProgressBar: quiz.showPuzzleProgressBar,
		allowNegativeAnswers: quiz.allowNegativeAnswers,
		adaptiveSkillByOperator:
			quiz.adaptiveSkillByOperator === undefined
				? [...defaultAdaptiveSkillMap]
				: normalizeAdaptiveSkillMap(quiz.adaptiveSkillByOperator),
		puzzleMode: normalizePuzzleMode(quiz.puzzleMode),
		operatorSettings: quiz.operatorSettings
	}

	if (quiz.selectedOperator != null) {
		normalizedQuiz.selectedOperator = normalizeSelectedOperator(
			quiz.selectedOperator
		)
	}

	if (quiz.difficulty != null) {
		normalizedQuiz.difficulty = normalizeDifficultyMode(quiz.difficulty)
	}

	return normalizedQuiz
}

function normalizePuzzleMode(
	value: number
): ReplayableQuizSnapshot['puzzleMode'] {
	switch (value) {
		case PuzzleMode.Normal:
		case PuzzleMode.Alternate:
		case PuzzleMode.Random:
			return value
		default:
			return PuzzleMode.Normal
	}
}

function normalizeSelectedOperator(
	value: number
): NonNullable<ReplayableQuizSnapshot['selectedOperator']> {
	switch (value) {
		case Operator.Addition:
		case Operator.Subtraction:
		case Operator.Multiplication:
		case Operator.Division:
		case OperatorExtended.All:
			return value
		default:
			return Operator.Addition
	}
}

function normalizeDifficultyMode(
	value: number
): NonNullable<ReplayableQuizSnapshot['difficulty']> {
	return value === 0 || value === 1 ? value : 0
}

function normalizeStoredPuzzleSet(puzzleSet: StoredPuzzleRaw[]): Puzzle[] {
	return puzzleSet.map((puzzle) => ({
		parts: normalizeStoredPuzzleParts(puzzle.parts),
		duration: puzzle.duration,
		isCorrect: puzzle.isCorrect ?? undefined,
		operator: normalizeOperator(puzzle.operator),
		unknownPartIndex: normalizeUnknownPartIndex(puzzle.unknownPartIndex),
		...(puzzle.puzzleMode !== undefined && {
			puzzleMode: normalizePuzzleMode(puzzle.puzzleMode)
		})
	}))
}

function normalizeQuizStats(quizStats: {
	correctAnswerCount: number
	correctAnswerPercentage: number
	starCount: number
	conceptStats?:
		| [string, { correct: number; total: number; avgDuration: number }][]
		| undefined
}): QuizStats {
	const normalizedQuizStats: QuizStats = {
		correctAnswerCount: quizStats.correctAnswerCount,
		correctAnswerPercentage: quizStats.correctAnswerPercentage,
		starCount: quizStats.starCount
	}

	if (quizStats.conceptStats !== undefined) {
		normalizedQuizStats.conceptStats = normalizeConceptPerformanceData(
			quizStats.conceptStats
		)
	}

	return normalizedQuizStats
}

function normalizeOperator(value: number): Puzzle['operator'] {
	switch (value) {
		case Operator.Addition:
		case Operator.Subtraction:
		case Operator.Multiplication:
		case Operator.Division:
			return value
		default:
			return Operator.Addition
	}
}

function normalizeUnknownPartIndex(value: number): Puzzle['unknownPartIndex'] {
	if (value === 0 || value === 1 || value === 2) return value
	return 2
}

function toReplayableQuiz(quiz: ReplayableQuizSnapshot): Quiz {
	return {
		seed: quiz.seed,
		duration: quiz.duration,
		showPuzzleProgressBar: quiz.showPuzzleProgressBar,
		allowNegativeAnswers: quiz.allowNegativeAnswers,
		puzzleMode: quiz.puzzleMode,
		selectedOperator: quiz.selectedOperator,
		difficulty: quiz.difficulty,
		operatorSettings: [
			{
				operator: Operator.Addition,
				range: quiz.operatorSettings[0].range,
				possibleValues: quiz.operatorSettings[0].possibleValues
			},
			{
				operator: Operator.Subtraction,
				range: quiz.operatorSettings[1].range,
				possibleValues: quiz.operatorSettings[1].possibleValues
			},
			{
				operator: Operator.Multiplication,
				range: quiz.operatorSettings[2].range,
				possibleValues: quiz.operatorSettings[2].possibleValues
			},
			{
				operator: Operator.Division,
				range: quiz.operatorSettings[3].range,
				possibleValues: quiz.operatorSettings[3].possibleValues
			}
		],
		state: QuizState.Started,
		adaptiveSkillByOperator: [...quiz.adaptiveSkillByOperator]
	}
}

export function parseAdaptiveSkillsSnapshot(value: unknown): AdaptiveSkillMap {
	const parsed = safeParse(adaptiveSkillMapSnapshotSchema, value)
	if (!parsed.success)
		return [
			defaultAdaptiveSkillMap[0],
			defaultAdaptiveSkillMap[1],
			defaultAdaptiveSkillMap[2],
			defaultAdaptiveSkillMap[3]
		]

	return normalizeAdaptiveSkillMap(parsed.output)
}

export function parseLastResultsSnapshot(
	value: unknown
): LastResultsSnapshot | null {
	const parsed = safeParse(lastResultsSnapshotSchema, value)
	if (!parsed.success) return null

	const normalizedQuiz = toReplayableQuiz(
		normalizeReplayableQuizSnapshot(parsed.output.quiz)
	)
	const normalizedPuzzleSet = normalizeStoredPuzzleSet(parsed.output.puzzleSet)
	const normalizedQuizStats = normalizeQuizStats(parsed.output.quizStats)

	const preQuizSkill = parsed.output.preQuizSkill
	if (preQuizSkill === undefined) {
		return {
			puzzleSet: normalizedPuzzleSet,
			quizStats: normalizedQuizStats,
			quiz: normalizedQuiz
		}
	}

	return {
		puzzleSet: normalizedPuzzleSet,
		quizStats: normalizedQuizStats,
		quiz: normalizedQuiz,
		preQuizSkill: normalizeAdaptiveSkillMap(preQuizSkill)
	}
}
