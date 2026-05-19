import { safeParse } from 'valibot'
import { defaultAdaptiveSkillMap } from './AdaptiveProfile'
import { clampSkill } from '$lib/helpers/adaptiveSkillUpdate'
import type { DifficultyMode, AdaptiveSkillMap } from './AdaptiveProfile'
import type { Puzzle } from './Puzzle'
import type { ConceptPerformanceData, QuizStats } from './QuizStats'
import type { Quiz } from './Quiz'
import { Operator, OperatorExtended } from '$lib/constants/Operator'
import type { OperatorExtended as OperatorExtendedType } from '$lib/constants/Operator'
import { QuizState } from '$lib/constants/QuizState'
import { PuzzleMode } from '$lib/constants/PuzzleMode'
import type { PuzzleMode as PuzzleModeType } from '$lib/constants/PuzzleMode'
import {
	adaptiveSkillMapSnapshotSchema,
	isKnownPuzzleConcept,
	lastResultsSnapshotSchema
} from './persistedSchemas'

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
	estimationMode?: boolean
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
	estimationMode?: boolean | undefined
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

type RawConceptStats = NonNullable<
	NonNullable<Parameters<typeof normalizeQuizStats>[0]['conceptStats']>
>

function normalizeConceptPerformanceData(
	conceptStats: RawConceptStats
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

	if (quiz.estimationMode !== undefined) {
		normalizedQuiz.estimationMode = quiz.estimationMode
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
		estimationMode: quiz.estimationMode ?? false,
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
