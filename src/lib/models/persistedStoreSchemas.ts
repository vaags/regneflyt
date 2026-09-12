import { safeParse, type InferOutput } from 'valibot'
import {
	cloneOperatorTuple,
	defaultOperatorSkillMap,
	type OperatorSkillMap,
	type OperandRange
} from '#lib/domain/skill-progression/skillModel.ts'
import { sanitizeOperatorSkillMap } from '#lib/domain/skill-progression/skillUpdate.ts'
import type { DifficultyMode } from '#lib/domain/skill-progression/difficultyMode.ts'
import type { Puzzle } from '#lib/domain/puzzle-generation/puzzle.ts'
import type { QuizStats } from './QuizStats'
import type { Quiz } from '#lib/domain/quiz/quiz.ts'
import { Operator } from '#lib/domain/arithmetic/operator.ts'
import type { OperatorExtended as OperatorExtendedType } from '#lib/domain/arithmetic/operator.ts'
import { QuizState } from '#lib/domain/quiz/quizState.ts'
import type { PuzzleMode as PuzzleModeType } from '#lib/domain/puzzle-generation/puzzleMode.ts'
import {
	operatorSkillMapSnapshotSchema,
	lastResultsSnapshotSchema
} from './persistedSchemas'

export type LastResultsSnapshot = {
	puzzleSet: Puzzle[]
	quizStats: QuizStats
	quiz: Quiz
	preQuizSkill?: OperatorSkillMap
}

type ReplayableOperatorSettingsSnapshot = {
	range: OperandRange
	possibleValues: number[]
}

type ReplayableQuizSnapshot = {
	seed: number
	duration: number
	showPuzzleProgressBar: boolean
	allowNegativeAnswers: boolean
	skillByOperator: OperatorSkillMap
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

type LastResultsRaw = InferOutput<typeof lastResultsSnapshotSchema>
type ReplayableQuizRaw = LastResultsRaw['quiz']
type StoredPuzzleRaw = LastResultsRaw['puzzleSet'][number]

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

function normalizeReplayableQuizSnapshot(
	quiz: ReplayableQuizRaw
): ReplayableQuizSnapshot {
	const normalizedQuiz: ReplayableQuizSnapshot = {
		seed: quiz.seed,
		duration: quiz.duration,
		showPuzzleProgressBar: quiz.showPuzzleProgressBar,
		allowNegativeAnswers: quiz.allowNegativeAnswers,
		skillByOperator:
			quiz.skillByOperator === undefined &&
			quiz.adaptiveSkillByOperator === undefined
				? [...defaultOperatorSkillMap]
				: sanitizeOperatorSkillMap(
						quiz.skillByOperator ?? quiz.adaptiveSkillByOperator
					),
		puzzleMode: quiz.puzzleMode,
		operatorSettings: quiz.operatorSettings
	}

	if (quiz.selectedOperator != null) {
		normalizedQuiz.selectedOperator = quiz.selectedOperator
	}

	if (quiz.difficulty != null) {
		normalizedQuiz.difficulty = quiz.difficulty
	}

	return normalizedQuiz
}

function normalizeStoredPuzzleSet(puzzleSet: StoredPuzzleRaw[]): Puzzle[] {
	return puzzleSet.map((puzzle) => ({
		parts: normalizeStoredPuzzleParts(puzzle.parts),
		duration: puzzle.duration,
		isCorrect: puzzle.isCorrect ?? undefined,
		operator: puzzle.operator,
		unknownPartIndex: puzzle.unknownPartIndex,
		...(puzzle.puzzleMode !== undefined && {
			puzzleMode: puzzle.puzzleMode
		})
	}))
}

function normalizeQuizStats(quizStats: {
	correctAnswerCount: number
	correctAnswerPercentage: number
	starCount: number
}): QuizStats {
	return {
		correctAnswerCount: quizStats.correctAnswerCount,
		correctAnswerPercentage: quizStats.correctAnswerPercentage,
		starCount: quizStats.starCount
	}
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
		skillByOperator: [...quiz.skillByOperator]
	}
}

export function parseOperatorSkillsSnapshot(value: unknown): OperatorSkillMap {
	const parsed = safeParse(operatorSkillMapSnapshotSchema, value)
	if (!parsed.success) return cloneOperatorTuple(defaultOperatorSkillMap)

	return sanitizeOperatorSkillMap(parsed.output)
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
		preQuizSkill: sanitizeOperatorSkillMap(preQuizSkill)
	}
}
